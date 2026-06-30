import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const { user, rt } = useAuth();
  const toast = useToast();

  const [channels, setChannels] = useState([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [view, setView] = useState("chat"); // 'chat' | 'admin'
  const [presence, setPresence] = useState({});
  const [modal, setModal] = useState(null); // 'create' | 'direct' | 'browse' | 'profile'
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const { links: appLinks, reload: reloadAppLinks } = useAppLinks();

  // Tracks message ids we've already accounted for in unread badges, so a
  // re-delivered event or a duplicate handler registration (e.g. after a
  // hot-reload while editing this file) can never bump a badge twice.
  const countedMessageIds = useRef(new Set());

  const active = useMemo(
    () => channels.find((c) => c.id === activeId) || null,
    [channels, activeId]
  );

  // The Chat-button count is *derived* from the per-channel unread badges — it
  // is never tracked as an independent counter. This makes the two badges
  // impossible to disagree: when a channel's badge clears, the total recomputes
  // automatically. The channel we're actively viewing never contributes (its
  // own badge is held at 0 while open).
  const unread = useMemo(() => {
    let total = 0;
    for (const c of channels) {
      if (view === "chat" && c.id === activeId) continue;
      total += c.unread_count || 0;
    }
    return total;
  }, [channels, activeId, view]);

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
  }, [reload]);

  // Subscribe to *every* channel the user belongs to (not just the active one),
  // so message_created events arrive for background channels and their sidebar
  // unread badges update live. ChannelScreen no longer unsubscribes on unmount,
  // so these stay active as the user navigates.
  useEffect(() => {
    if (!rt) return;
    for (const c of channels) rt.subscribe(c.id);
  }, [rt, channels]);

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

  // Notifications drive the toast + discovery of brand-new DMs/channels ONLY.
  // They deliberately do NOT touch any unread counter: the Chat-button count is
  // derived from per-channel unread badges, and those badges are owned solely by
  // the `message_created` handler below. Keeping counting in exactly one place
  // is what prevents the double-count.
  useRealtime("notification", (f) => {
    const n = f.notification;
    const chId = n?.payload?.channel_id;
    // If it's for the channel we're actively viewing, mark it read right away so
    // it never lingers as unread on the server.
    if (chId && chId === activeId && view === "chat") {
      if (n.id) api.markRead(n.id).catch(() => {});
      return;
    }
    const kindLabel = {
      mention: "New mention",
      direct_message: "New direct message",
      channel_invite: "Added to a channel",
      thread_reply: "New reply",
    }[n?.kind] || "Notification";
    toast.info(kindLabel, notifPreview(n));
    // If this points to a channel/DM we don't have yet (first-ever DM, or being
    // added to a channel), pull the list so it appears with its unread badge.
    const haveChannel = chId && channels.some((c) => c.id === chId);
    if (n?.kind === "channel_invite" || (chId && !haveChannel)) {
      reload();
    }
  });

  // reorder channels on new activity + bump the per-channel unread badge.
  // This is the SINGLE source of truth for unread counting; the Chat-button
  // total is derived from these badges. The bump is idempotent per message id.
  useRealtime("message_created", (f) => {
    const msg = f.message;
    const msgId = msg?.id;
    const fromMe = msg?.author?.id === user.id || msg?.user_id === user.id;
    const isActive = f.channel_id === activeId && view === "chat";

    // Guard against double-counting the same message (re-delivery / duplicate
    // handler after hot-reload). Only a real, not-yet-counted message bumps.
    const alreadyCounted = msgId && countedMessageIds.current.has(msgId);
    const shouldCount = !fromMe && !isActive && msgId && !alreadyCounted;
    if (shouldCount) countedMessageIds.current.add(msgId);

    let known = true;
    setChannels((cs) => {
      const i = cs.findIndex((c) => c.id === f.channel_id);
      if (i < 0) {
        known = false;
        return cs;
      }
      const updated = { ...cs[i] };
      if (shouldCount) {
        updated.unread_count = (updated.unread_count || 0) + 1;
      }
      const next = cs.slice();
      next.splice(i, 1);
      return [updated, ...next];
    });
    // A message in a channel/DM we don't know yet (first-ever DM) — pull the list.
    if (!known && !fromMe) reload();
  });

  // When a channel is opened, clear its server-side notifications (mentions,
  // DMs, invites for that channel). The Chat-button count is derived from the
  // per-channel badges, so zeroing the badge in openChannel already updates the
  // total instantly — there is nothing to reconcile here and so no race.
  const clearChannelNotifications = useCallback(async (channelId) => {
    try {
      const unreadNotifs = await api.notifications(true, 100);
      const mine = unreadNotifs.filter((n) => n?.payload?.channel_id === channelId);
      if (mine.length > 0) {
        await Promise.all(mine.map((n) => api.markRead(n.id).catch(() => {})));
      }
    } catch {
      /* best-effort; the derived badge is already cleared locally */
    }
  }, []);

  function openChannel(id) {
    setActiveId(id);
    setView("chat");
    setMobileSidebar(false);
    // Opening a channel reads it (the engine advances last_read_at when history
    // loads), so clear its sidebar unread badge immediately. The derived
    // Chat-button total drops by the same amount in the same render.
    setChannels((cs) =>
      cs.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
    );
    // Forget the message ids we'd counted for this channel: future messages here
    // (after we navigate away again) must be free to bump the badge anew.
    countedMessageIds.current.clear();
    clearChannelNotifications(id);
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
