import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/endpoints.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useRealtime } from "../hooks/useRealtime.js";
import { useAppLinks } from "../hooks/useAppLinks.js";

import WorkspaceRail from "../components/sidebar/WorkspaceRail.jsx";
import Sidebar from "../components/sidebar/Sidebar.jsx";
import ChannelScreen from "../components/chat/ChannelScreen.jsx";
import AdminConsole from "../components/admin/AdminConsole.jsx";
import CreateChannelModal from "../components/modals/CreateChannelModal.jsx";
import NewDirectModal from "../components/modals/NewDirectModal.jsx";
import BrowseChannelsModal from "../components/modals/BrowseChannelsModal.jsx";
import ProfileModal from "../components/modals/ProfileModal.jsx";
import SettingsModal from "../components/modals/SettingsModal.jsx";
import { EmptyState } from "../components/common/Modal.jsx";
import Icon from "../components/common/Icon.jsx";

export default function Workspace() {
  const { user } = useAuth();
  const toast = useToast();

  const [channels, setChannels] = useState([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [view, setView] = useState("chat"); // 'chat' | 'admin'
  const [presence, setPresence] = useState({});
  const [unread, setUnread] = useState(0);
  const [modal, setModal] = useState(null); // 'create' | 'direct' | 'browse' | 'profile'
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const { links: appLinks, reload: reloadAppLinks } = useAppLinks();

  const active = useMemo(
    () => channels.find((c) => c.id === activeId) || null,
    [channels, activeId]
  );

  const hydrateDirect = useCallback(
    async (list) =>
      Promise.all(
        list.map(async (ch) => {
          if (ch.channel_type !== "direct") return ch;
          try {
            const members = await api.listMembers(ch.id);
            const peer = members.find((m) => m.id !== user.id) || members[0];
            return { ...ch, peer };
          } catch {
            return ch;
          }
        })
      ),
    [user.id]
  );

  const reload = useCallback(async () => {
    try {
      const list = await api.listChannels();
      const hydrated = await hydrateDirect(list);
      setChannels(hydrated);
      setActiveId((cur) => cur || hydrated.find((c) => c.channel_type !== "direct")?.id || hydrated[0]?.id || null);
    } catch (e) {
      toast.error("Couldn't load channels", e.message);
    } finally {
      setLoadingChannels(false);
    }
  }, [hydrateDirect, toast]);

  useEffect(() => {
    reload();
    api.unreadCount().then((r) => setUnread(r.unread)).catch(() => {});
  }, [reload]);

  // Seed presence: realtime `presence` events only tell us about *changes*
  // after we connect, so without an initial fetch everyone shows offline until
  // they next toggle. Collect the user IDs we care about (DM peers) plus
  // ourselves and ask the engine for their current status, then refresh on a
  // gentle interval to catch anything missed while reconnecting.
  const knownUserIds = useMemo(() => {
    const ids = new Set([user.id]);
    for (const ch of channels) {
      if (ch.peer?.id) ids.add(ch.peer.id);
    }
    return Array.from(ids);
  }, [channels, user.id]);

  const refreshPresence = useCallback(async (ids) => {
    if (!ids || ids.length === 0) return;
    try {
      const rows = await api.bulkPresence(ids);
      setPresence((p) => {
        const next = { ...p };
        for (const r of rows) {
          next[r.user_id] = { online: r.online, last_seen: r.last_seen };
        }
        return next;
      });
    } catch {
      /* presence is best-effort; ignore failures */
    }
  }, []);

  useEffect(() => {
    refreshPresence(knownUserIds);
    const t = setInterval(() => refreshPresence(knownUserIds), 60000);
    return () => clearInterval(t);
  }, [knownUserIds, refreshPresence]);

  // We are online by definition while connected; reflect that immediately.
  useEffect(() => {
    setPresence((p) => ({ ...p, [user.id]: { online: true, last_seen: null } }));
  }, [user.id]);

  // presence updates
  useRealtime("presence", (f) => {
    setPresence((p) => ({ ...p, [f.user_id]: { online: f.online, last_seen: f.last_seen } }));
  });

  // notifications -> bump unread + toast
  useRealtime("notification", (f) => {
    setUnread((n) => n + 1);
    const n = f.notification;
    const kindLabel = {
      mention: "New mention",
      direct_message: "New direct message",
      channel_invite: "Added to a channel",
      thread_reply: "New reply",
    }[n?.kind] || "Notification";
    toast.info(kindLabel, notifPreview(n));
    // a channel invite may mean a new channel to show
    if (n?.kind === "channel_invite") reload();
  });

  // reorder channels on new activity
  useRealtime("message_created", (f) => {
    setChannels((cs) => {
      const i = cs.findIndex((c) => c.id === f.channel_id);
      if (i <= 0) return cs;
      const next = cs.slice();
      const [m] = next.splice(i, 1);
      return [m, ...next];
    });
  });

  function openChannel(id) {
    setActiveId(id);
    setView("chat");
    setMobileSidebar(false);
  }

  async function afterCreateChannel(ch) {
    setModal(null);
    await reload();
    openChannel(ch.id);
    toast.success("Channel created", `#${ch.name}`);
  }

  async function afterStartDirect(ch) {
    setModal(null);
    await reload();
    openChannel(ch.id);
  }

  return (
    <div className={`workspace ${mobileSidebar ? "show-sidebar" : ""}`}>
      <WorkspaceRail
        user={user}
        view={view}
        unread={unread}
        appLinks={appLinks}
        onChat={() => setView("chat")}
        onAdmin={() => setView("admin")}
        onProfile={() => setModal("profile")}
      />

      <Sidebar
        channels={channels}
        loading={loadingChannels}
        activeId={view === "chat" ? activeId : null}
        presence={presence}
        onOpenChannel={openChannel}
        onCreateChannel={() => setModal("create")}
        onBrowse={() => setModal("browse")}
        onNewDirect={() => setModal("direct")}
      />

      <main className="main">
        {view === "admin" ? (
          <AdminConsole onAppLinksChanged={reloadAppLinks} />
        ) : active ? (
          <ChannelScreen
            key={active.id}
            channel={active}
            presence={presence}
            onChannelChanged={reload}
            onLeft={() => {
              setActiveId(null);
              reload();
            }}
            onToggleSidebar={() => setMobileSidebar((s) => !s)}
          />
        ) : (
          <div className="main-empty">
            <EmptyState
              icon={<Icon name="message" size={40} />}
              title={loadingChannels ? "Loading…" : "No channel selected"}
              hint="Pick a channel from the sidebar, browse channels to join, or start a direct message."
              action={
                <div className="empty-actions">
                  <button className="btn btn-primary" onClick={() => setModal("browse")}>
                    Browse channels
                  </button>
                  <button className="btn" onClick={() => setModal("create")}>
                    Create a channel
                  </button>
                </div>
              }
            />
          </div>
        )}
      </main>

      {modal === "create" && (
        <CreateChannelModal onClose={() => setModal(null)} onCreated={afterCreateChannel} />
      )}
      {modal === "direct" && (
        <NewDirectModal onClose={() => setModal(null)} onStarted={afterStartDirect} />
      )}
      {modal === "browse" && (
        <BrowseChannelsModal
          joined={channels}
          onClose={() => setModal(null)}
          onJoined={async (ch) => {
            setModal(null);
            await reload();
            openChannel(ch.id);
          }}
          onCreateNew={() => setModal("create")}
        />
      )}
      {modal === "profile" && (
        <ProfileModal onClose={() => setModal(null)} onOpenSettings={() => setModal("settings")} />
      )}
      {modal === "settings" && <SettingsModal onClose={() => setModal(null)} />}

      {mobileSidebar && <div className="sidebar-scrim" onClick={() => setMobileSidebar(false)} />}
    </div>
  );
}

function notifPreview(n) {
  if (!n) return "";
  const p = n.payload || {};
  return p.preview || p.content || (p.channel_name ? `in #${p.channel_name}` : "Open RSMC to view.");
}
