import { useState, useEffect, useRef } from "react";
import { channelName, displayName } from "../../lib/format.js";
import Avatar from "../common/Avatar.jsx";
import Icon from "../common/Icon.jsx";
import { Modal } from "../common/Modal.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export default function Sidebar({
  channels,
  loading,
  activeId,
  tabVisible = true,
  presence,
  onOpenChannel,
  onCreateChannel,
  onBrowse,
  onNewDirect,
}) {
  const { user } = useAuth();
  const groups = {
    channels: channels.filter((c) => c.channel_type === "public" || c.channel_type === "private" || c.channel_type === "group"),
    directs: channels.filter((c) => c.channel_type === "direct"),
  };

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <WorkspaceMenu onBrowse={onBrowse} />
      </header>

      <div className="sidebar-scroll">
        <Section
          title="Channels"
          onAdd={onCreateChannel}
          addTitle="Create channel"
        >
          {loading ? (
            <SkeletonRows />
          ) : groups.channels.length === 0 ? (
            <button className="sidebar-link sidebar-link-muted" onClick={onBrowse}>
              <Icon name="plus" size={16} />
              <span>Add channels</span>
            </button>
          ) : (
            groups.channels.map((ch) => (
              <ChannelRow
                key={ch.id}
                channel={ch}
                active={ch.id === activeId}
                tabVisible={tabVisible}
                onClick={() => onOpenChannel(ch.id)}
              />
            ))
          )}
        </Section>

        <Section title="Direct messages" onAdd={onNewDirect} addTitle="New message">
          {groups.directs.length === 0 ? (
            <button className="sidebar-link sidebar-link-muted" onClick={onNewDirect}>
              <Icon name="plus" size={16} />
              <span>Start a conversation</span>
            </button>
          ) : (
            groups.directs.map((ch) => {
              const online = ch.peer ? presence[ch.peer.id]?.online : false;
              const unread = (ch.id !== activeId || !tabVisible) && ch.unread_count > 0 ? ch.unread_count : 0;
              const muted = !!ch.muted;
              return (
                <button
                  key={ch.id}
                  className={`sidebar-link ${ch.id === activeId ? "active" : ""} ${unread && !muted ? "has-unread" : ""} ${muted ? "is-muted" : ""}`}
                  onClick={() => onOpenChannel(ch.id)}
                >
                  <Avatar user={ch.peer} size={22} online={!!online} />
                  <span className="sidebar-link-name">
                    {ch.peer ? displayName(ch.peer) : "Direct message"}
                  </span>
                  {unread > 0 && (
                    <span className={`sidebar-unread ${muted ? "is-muted" : ""}`}>
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </Section>
      </div>
    </aside>
  );
}

// The RSMC wordmark doubles as a workspace menu button. It replaces the old
// standalone search icon in the header, which was easy to confuse with the
// message-search icon elsewhere; "Browse channels" now lives here instead, so
// there is one unambiguous search.
function WorkspaceMenu({ onBrowse }) {
  const [open, setOpen] = useState(false);
  const [about, setAbout] = useState(false);
  const ref = useRef(null);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const copyInvite = async () => {
    setOpen(false);
    // Signup is open on an RSMC instance, so the app's own URL is the invite:
    // a new person lands on the auth screen and chooses "Create an account".
    const url = window.location.origin;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied", url);
    } catch {
      toast.error("Couldn't copy", url);
    }
  };

  return (
    <div className="workspace-menu" ref={ref}>
      <button
        className={`workspace-menu-trigger ${open ? "is-open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="sidebar-workspace">RSMC</span>
        <Icon name="chevronDown" size={16} />
      </button>

      {open && (
        <div className="workspace-menu-dropdown" role="menu">
          <button className="workspace-menu-item" role="menuitem" onClick={() => { setOpen(false); onBrowse?.(); }}>
            <Icon name="search" size={16} />
            <span>Browse channels</span>
          </button>
          <button className="workspace-menu-item" role="menuitem" onClick={copyInvite}>
            <Icon name="copy" size={16} />
            <span>Invite people</span>
          </button>
          <div className="workspace-menu-sep" />
          <button className="workspace-menu-item" role="menuitem" onClick={() => { setOpen(false); setAbout(true); }}>
            <Icon name="message" size={16} />
            <span>About RSMC</span>
          </button>
        </div>
      )}

      {about && <AboutModal onClose={() => setAbout(false)} />}
    </div>
  );
}

function AboutModal({ onClose }) {
  // Build-time version from package.json, injected by Vite at build.
  const version = import.meta.env.VITE_APP_VERSION || "dev";
  return (
    <Modal title="About RSMC" subtitle="Self-hosted team chat" onClose={onClose} width={420}>
      <div className="about-body">
        <p className="about-line"><span>Version</span><strong>{version}</strong></p>
        <p className="about-note">
          RSMC is a self-hosted Slack/Mattermost-style team chat platform.
        </p>
      </div>
    </Modal>
  );
}

function Section({ title, onAdd, addTitle, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="sidebar-section">
      <div className="sidebar-section-head">
        <button className="sidebar-section-toggle" onClick={() => setOpen((o) => !o)}>
          <Icon name="chevronDown" size={14} style={{ transform: open ? "none" : "rotate(-90deg)" }} />
          <span>{title}</span>
        </button>
        {onAdd && (
          <button className="sidebar-section-add" onClick={onAdd} title={addTitle} aria-label={addTitle}>
            <Icon name="plus" size={15} />
          </button>
        )}
      </div>
      {open && <div className="sidebar-section-body">{children}</div>}
    </div>
  );
}

function ChannelRow({ channel, active, tabVisible = true, onClick }) {
  const isPrivate = channel.channel_type === "private";
  const isGroup = channel.channel_type === "group";
  const unread = (!active || !tabVisible) && channel.unread_count > 0 ? channel.unread_count : 0;
  const muted = !!channel.muted;
  return (
    <button
      className={`sidebar-link ${active ? "active" : ""} ${unread && !muted ? "has-unread" : ""} ${muted ? "is-muted" : ""}`}
      onClick={onClick}
      title={muted ? "Muted" : undefined}
    >
      <span className="sidebar-link-glyph">
        <Icon name={isPrivate ? "lock" : isGroup ? "group" : "hash"} size={16} />
      </span>
      <span className="sidebar-link-name">{channel.name || "untitled"}</span>
      {unread > 0 && (
        <span className={`sidebar-unread ${muted ? "is-muted" : ""}`}>
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}

function SkeletonRows() {
  return (
    <div className="skeleton-rows">
      {[70, 55, 80, 60].map((w, i) => (
        <div key={i} className="skeleton-row" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}
