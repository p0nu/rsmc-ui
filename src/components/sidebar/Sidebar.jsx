import { useState } from "react";
import { channelName, displayName } from "../../lib/format.js";
import Avatar from "../common/Avatar.jsx";
import Icon from "../common/Icon.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Sidebar({
  channels,
  loading,
  activeId,
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
        <h1 className="sidebar-workspace">RSMC</h1>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onBrowse} title="Browse channels">
          <Icon name="search" size={17} />
        </button>
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
              const unread = ch.id !== activeId && ch.unread_count > 0 ? ch.unread_count : 0;
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

function ChannelRow({ channel, active, onClick }) {
  const isPrivate = channel.channel_type === "private";
  const isGroup = channel.channel_type === "group";
  const unread = !active && channel.unread_count > 0 ? channel.unread_count : 0;
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
