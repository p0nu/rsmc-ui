import { channelName, displayName } from "../../lib/format.js";
import Icon from "../common/Icon.jsx";

export default function ChannelHeader({
  channel,
  presence,
  memberCount,
  activePanel,
  onToggleMembers,
  onToggleFiles,
  onOpenSettings,
  onToggleSidebar,
}) {
  const isDirect = channel.channel_type === "direct";
  const isPrivate = channel.channel_type === "private";
  const peerOnline = isDirect && channel.peer ? presence[channel.peer.id]?.online : null;
  const title = isDirect ? displayName(channel.peer) : channel.name || "untitled";

  return (
    <header className="channel-header">
      <button className="channel-header-menu" onClick={onToggleSidebar} aria-label="Menu">
        <Icon name="back" size={20} />
      </button>

      <div className="channel-header-id">
        <span className="channel-header-glyph">
          {isDirect ? (
            <span className={`presence ${peerOnline ? "online" : ""}`} style={{ width: 11, height: 11 }} />
          ) : (
            <Icon name={isPrivate ? "lock" : "hash"} size={18} />
          )}
        </span>
        <h2 className="channel-header-title">{title}</h2>
        {channel.topic && (
          <>
            <span className="channel-header-divider" />
            <span className="channel-header-topic">{channel.topic}</span>
          </>
        )}
      </div>

      <div className="channel-header-actions">
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
