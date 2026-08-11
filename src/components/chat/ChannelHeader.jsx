import { channelName, displayName } from "../../lib/format.js";
import Avatar from "../common/Avatar.jsx";
import Icon from "../common/Icon.jsx";

export default function ChannelHeader({
  channel,
  presence,
  memberCount,
  activePanel,
  onToggleMembers,
  onToggleFiles,
  onTogglePins,
  onToggleScheduled,
  onSearch,
  onOpenSettings,
  onToggleSidebar,
}) {
  const isDirect = channel.channel_type === "direct";
  const isPrivate = channel.channel_type === "private";
  const isArchived = !!channel.archived_at;
  const peerOnline = isDirect && channel.peer ? presence[channel.peer.id]?.online : null;
  const title = isDirect ? displayName(channel.peer) : channel.name || "untitled";

  return (
    <header className="channel-header">
      <button className="channel-header-menu" onClick={onToggleSidebar} aria-label="Menu">
        <Icon name="menu" size={20} />
      </button>

      <div className="channel-header-id">
        <span className="channel-header-glyph">
          {isDirect ? (
            channel.peer ? (
              <Avatar user={channel.peer} size={22} online={!!peerOnline} />
            ) : (
              <span
                className={`presence ${peerOnline ? "online" : ""}`}
                style={{ width: 11, height: 11 }}
                role="img"
                aria-label={peerOnline ? "Online" : "Offline"}
                title={peerOnline ? "Online" : "Offline"}
              />
            )
          ) : (
            <Icon name={isPrivate ? "lock" : "hash"} size={18} />
          )}
        </span>
        <h2 className="channel-header-title">{title}</h2>
        {isDirect && channel.peer && (channel.peer.status_emoji || channel.peer.status_text) && (
          <span className="channel-header-status" title={channel.peer.status_text || ""}>
            {channel.peer.status_emoji && (
              <span className="channel-header-status-emoji">{channel.peer.status_emoji}</span>
            )}
            {channel.peer.status_text && (
              <span className="channel-header-status-text">{channel.peer.status_text}</span>
            )}
          </span>
        )}
        {isArchived && (
          <span className="channel-header-archived" title="This channel is archived">
            <Icon name="archive" size={13} /> Archived
          </span>
        )}
        {channel.topic && (
          <>
            <span className="channel-header-divider" />
            <span className="channel-header-topic">{channel.topic}</span>
          </>
        )}
      </div>

      <div className="channel-header-actions">
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={onSearch}
          title="Search messages"
        >
          <Icon name="search" size={17} />
        </button>
        {!isDirect && (
          <button
            className={`btn btn-ghost btn-icon btn-sm ${activePanel === "scheduled" ? "active" : ""}`}
            onClick={onToggleScheduled}
            title="Scheduled messages"
          >
            <Icon name="clock" size={17} />
          </button>
        )}
        <button
          className={`btn btn-ghost btn-icon btn-sm ${activePanel === "pins" ? "active" : ""}`}
          onClick={onTogglePins}
          title="Pinned messages"
        >
          <Icon name="pin" size={17} />
        </button>
        {!isDirect && (
          <button
            className={`btn btn-ghost btn-sm channel-header-members ${activePanel === "members" ? "active" : ""}`}
            onClick={onToggleMembers}
            title="Members"
          >
            <Icon name="users" size={17} />
            <span>{memberCount}</span>
          </button>
        )}
        <button
          className={`btn btn-ghost btn-icon btn-sm ${activePanel === "files" ? "active" : ""}`}
          onClick={onToggleFiles}
          title="Files"
        >
          <Icon name="file" size={17} />
        </button>
        {!isDirect && (
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onOpenSettings} title="Channel settings">
            <Icon name="settings" size={17} />
          </button>
        )}
      </div>
    </header>
  );
}
