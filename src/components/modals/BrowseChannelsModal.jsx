import { useEffect, useState } from "react";
import { api } from "../../api/endpoints.js";
import { useToast } from "../../context/ToastContext.jsx";
import { Modal, EmptyState, Loading } from "../common/Modal.jsx";
import Icon from "../common/Icon.jsx";

// A real public-channel directory backed by GET /channels/browse. Public
// channels can be joined in place (POST /channels/:id/join); channels you're
// already in show an Open action instead.
export default function BrowseChannelsModal({ onClose, onOpen, onJoined, onCreateNew }) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
    let live = true;
    api
      .browseChannels()
      .then((rows) => {
        if (live) setChannels(Array.isArray(rows) ? rows : []);
      })
      .catch((e) => toast.error("Couldn't load channels", e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [toast]);

  const filtered = channels.filter((c) =>
    (c.name || "").toLowerCase().includes(query.toLowerCase())
  );

  async function join(ch) {
    setJoiningId(ch.id);
    try {
      await api.joinChannel(ch.id);
      onJoined?.(ch);
    } catch (e) {
      toast.error("Couldn't join channel", e.message);
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <Modal
      title="Browse channels"
      subtitle="Public channels in this workspace. Join one to start participating."
      onClose={onClose}
      width={520}
      footer={
        <div className="form-actions" style={{ justifyContent: "space-between" }}>
          <span className="muted" style={{ fontSize: 13 }}>{filtered.length} channels</span>
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
        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Icon name="hash" size={30} />}
            title={query ? "No matching channels" : "No public channels yet"}
            hint="Create the first public channel to get the conversation started."
          />
        ) : (
          filtered.map((ch) => (
            <div key={ch.id} className="browse-row">
              <span className="browse-glyph">
                <Icon name="hash" size={18} />
              </span>
              <span className="browse-meta">
                <span className="browse-name">{ch.name}</span>
                <span className="browse-sub">
                  <span className="browse-count">
                    <Icon name="users" size={12} /> {ch.member_count}
                  </span>
                  {ch.topic && <span className="browse-topic">{ch.topic}</span>}
                </span>
              </span>
              {ch.is_member ? (
                <button className="btn btn-sm" onClick={() => onOpen?.(ch)}>
                  Open
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => join(ch)}
                  disabled={joiningId === ch.id}
                >
                  {joiningId === ch.id ? <span className="spinner on-brand" /> : "Join"}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
