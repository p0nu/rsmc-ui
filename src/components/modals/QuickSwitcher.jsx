import { useEffect, useMemo, useRef, useState } from "react";
import { channelName } from "../../lib/format.js";
import Icon from "../common/Icon.jsx";

// A keyboard-first quick switcher (Cmd/Ctrl+K). Type to filter channels and
// DMs, arrow keys to move, Enter to open, Escape to close. Purely client-side
// over the already-loaded channel list, so it's instant.
export default function QuickSwitcher({ channels, selfId, onPick, onClose }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const scored = channels
      .map((c) => ({ c, name: channelName(c, selfId) }))
      .filter(({ name }) => !q || name.toLowerCase().includes(q));
    // Keep channels before DMs when no query, otherwise preserve match order.
    return scored.slice(0, 50);
  }, [channels, selfId, query]);

  // Clamp the active index whenever the result set changes.
  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, results.length - 1)));
  }, [results.length]);

  function onKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = results[index];
      if (hit) {
        onPick(hit.c.id);
        onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  // Keep the active row scrolled into view.
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${index}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [index]);

  return (
    <div className="qs-overlay" onMouseDown={onClose}>
      <div className="qs-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="qs-input-row">
          <Icon name="search" size={18} className="qs-input-icon" />
          <input
            ref={inputRef}
            className="qs-input"
            placeholder="Jump to a channel or person..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={onKeyDown}
          />
          <kbd className="qs-esc">esc</kbd>
        </div>
        <div className="qs-list" ref={listRef}>
          {results.length === 0 ? (
            <div className="qs-empty">No channels or people match "{query}".</div>
          ) : (
            results.map(({ c, name }, i) => {
              const isDirect = c.channel_type === "direct";
              return (
                <button
                  key={c.id}
                  data-idx={i}
                  className={`qs-item ${i === index ? "active" : ""}`}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => {
                    onPick(c.id);
                    onClose();
                  }}
                >
                  <Icon
                    name={isDirect ? "at" : c.channel_type === "private" ? "lock" : "hash"}
                    size={15}
                  />
                  <span className="qs-item-name">{name}</span>
                  {c.unread_count > 0 && <span className="qs-badge">{c.unread_count}</span>}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
