import { useEffect, useState, useCallback } from "react";
import { api } from "../../api/endpoints.js";
import { useToast } from "../../context/ToastContext.jsx";
import { Loading, EmptyState } from "../common/Modal.jsx";
import Icon from "../common/Icon.jsx";

// Formats a scheduled_for timestamp as an absolute, friendly local time.
function whenLabel(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const opts = sameDay
    ? { hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
  return d.toLocaleString(undefined, opts);
}

export default function ScheduledPanel({ channel, onClose }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.listScheduled(channel.id);
      setItems(Array.isArray(rows) ? rows : []);
    } catch (e) {
      toast.error("Couldn't load scheduled messages", e.message);
    } finally {
      setLoading(false);
    }
  }, [channel.id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function cancel(id) {
    try {
      await api.cancelScheduled(id);
      setItems((xs) => xs.filter((x) => x.id !== id));
    } catch (e) {
      toast.error("Couldn't cancel", e.message);
    }
  }

  return (
    <aside className="rightpanel scheduled-panel">
      <header className="rightpanel-head">
        <div className="rightpanel-title">
          <h3>Scheduled</h3>
          <span className="muted">
            {items.length} message{items.length === 1 ? "" : "s"}
          </span>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">
          <Icon name="x" size={18} />
        </button>
      </header>

      <div className="rightpanel-body">
        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Icon name="clock" size={32} />}
            title="Nothing scheduled"
            hint="Messages you schedule for later will appear here until they're sent."
          />
        ) : (
          <div className="scheduled-list">
            {items.map((s) => (
              <div key={s.id} className="scheduled-item">
                <div className="scheduled-when">
                  <Icon name="clock" size={13} />
                  <span>{whenLabel(s.scheduled_for)}</span>
                </div>
                <div className="scheduled-content">{s.content}</div>
                <button
                  className="btn btn-ghost btn-sm scheduled-cancel"
                  onClick={() => cancel(s.id)}
                >
                  <Icon name="trash" size={14} /> Cancel
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
