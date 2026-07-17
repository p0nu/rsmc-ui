import { useEffect, useRef, useState } from "react";
import { api } from "../../api/endpoints.js";
import { clockTime, dayLabel, displayName } from "../../lib/format.js";
import { Modal, Loading, EmptyState } from "../common/Modal.jsx";
import Icon from "../common/Icon.jsx";

// Full-text message search. Scope toggles between the current channel and every
// channel the user belongs to. Results are debounced as you type.
export default function SearchModal({ channel, onClose }) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("channel"); // 'channel' | 'all'
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await api.search(q, {
          channelId: scope === "channel" ? channel.id : undefined,
        });
        setResults(res.results || []);
        setSearched(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => timer.current && clearTimeout(timer.current);
  }, [query, scope, channel.id]);

  return (
    <Modal
      title="Search messages"
      onClose={onClose}
      width={560}
    >
      <div className="input-with-icon">
        <Icon name="search" size={16} className="input-icon" />
        <input
          className="input"
          autoFocus
          placeholder="Search messages…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ paddingLeft: 36 }}
        />
      </div>

      <div className="search-scope">
        <button
          className={`chip ${scope === "channel" ? "active" : ""}`}
          onClick={() => setScope("channel")}
        >
          {channel.name ? `#${channel.name}` : "This conversation"}
        </button>
        <button
          className={`chip ${scope === "all" ? "active" : ""}`}
          onClick={() => setScope("all")}
        >
          All channels
        </button>
      </div>

      <div className="search-results">
        {loading ? (
          <Loading />
        ) : searched && results.length === 0 ? (
          <EmptyState
            icon={<Icon name="search" size={30} />}
            title="No matches"
            hint="Try a different word or phrase."
          />
        ) : (
          results.map((m) => (
            <div key={m.id} className="search-hit">
              <div className="search-hit-meta">
                <span className="search-hit-author">{displayName(m.author)}</span>
                <span className="muted">
                  {dayLabel(m.created_at)} · {clockTime(m.created_at)}
                </span>
              </div>
              <div className="search-hit-text">{m.content}</div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
