import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/endpoints.js";
import { clockTime, displayName } from "../../lib/format.js";
import Icon from "../common/Icon.jsx";
import { Loading, EmptyState } from "../common/Modal.jsx";
import { useRealtime } from "../../hooks/useRealtime.js";

// Lists the channel's pinned messages. Reloads when a MessageUpdated event
// arrives for this channel (covers pin/unpin from any client).
export default function PinsPanel({ channel, onClose, onJump }) {
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    let live = true;
    api
      .channelPins(channel.id)
      .then((rows) => live && setPins(Array.isArray(rows) ? rows : []))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [channel.id]);

  useEffect(() => {
    setLoading(true);
    return reload();
  }, [reload]);

  useRealtime("message_updated", (f) => {
    if (f.channel_id === channel.id) reload();
  });

  async function unpin(id) {
    try {
      await api.unpinMessage(id);
      setPins((p) => p.filter((m) => m.id !== id));
    } catch {
      /* ignore; realtime will reconcile */
    }
  }

  return (
    <aside className="rightpanel">
      <header className="rightpanel-head">
        <div className="rightpanel-title">
          <h3>Pinned</h3>
          <span className="muted">{pins.length} message{pins.length === 1 ? "" : "s"}</span>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">
          <Icon name="x" size={18} />
        </button>
      </header>
      <div className="rightpanel-body">
        {loading ? (
          <Loading />
        ) : pins.length === 0 ? (
          <EmptyState
            icon={<Icon name="pin" size={32} />}
            title="No pinned messages"
            hint="Pin an important message and it'll show up here."
          />
        ) : (
          <div className="pins-list">
            {pins.map((m) => (
              <div key={m.id} className="pin-card">
                <button type="button" className="pin-card-main" onClick={() => onJump?.(m)}>
                  <span className="pin-card-meta">
                    {displayName(m.author)} · {clockTime(m.created_at)}
                  </span>
                  <span className="pin-card-text">{m.content}</span>
                </button>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => unpin(m.id)}
                  title="Unpin"
                >
                  <Icon name="x" size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
