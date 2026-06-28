import { useState } from "react";
import { channelName } from "../../lib/format.js";
import { Modal, EmptyState } from "../common/Modal.jsx";
import Icon from "../common/Icon.jsx";

// The engine's channel list endpoint returns only channels the caller belongs
// to (there's no public directory route), so "browse" lists your channels and
// offers to create a new one. This keeps behavior honest with the backend and
// is a clean seam to plug a discovery endpoint into later.
export default function BrowseChannelsModal({ joined, onClose, onJoined, onCreateNew }) {
  const [query, setQuery] = useState("");
  const channels = joined.filter(
    (c) => c.channel_type !== "direct" && (c.name || "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Modal
      title="Channels"
      subtitle="Channels you're a member of. Create a new one to start another conversation."
      onClose={onClose}
      width={520}
      footer={
        <div className="form-actions" style={{ justifyContent: "space-between" }}>
          <span className="muted" style={{ fontSize: 13 }}>{channels.length} channels</span>
          <button className="btn btn-primary" onClick={onCreateNew}>
            <Icon name="plus" size={16} /> Create channel
          </button>
        </div>
      }
    >
      <div className="input-with-icon">
        <Icon name="search" size={16} className="input-icon" />
        <input
          className="input"
          autoFocus
          placeholder="Filter channels…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ paddingLeft: 36 }}
        />
      </div>

      <div className="browse-list">
        {channels.length === 0 ? (
          <EmptyState
            icon={<Icon name="hash" size={30} />}
            title={query ? "No matching channels" : "No channels yet"}
            hint="Create your first channel to get the conversation started."
          />
        ) : (
          channels.map((ch) => (
            <button key={ch.id} className="browse-row" onClick={() => onJoined(ch)}>
              <span className="browse-glyph">
                <Icon name={ch.channel_type === "private" ? "lock" : "hash"} size={18} />
              </span>
              <span className="browse-meta">
                <span className="browse-name">{ch.name}</span>
                {ch.topic && <span className="browse-topic">{ch.topic}</span>}
              </span>
              <span className="browse-open">Open</span>
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}
