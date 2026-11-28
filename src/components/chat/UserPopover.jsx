import { useEffect, useRef, useState } from "react";
import Avatar from "../common/Avatar.jsx";
import Icon from "../common/Icon.jsx";
import { displayName, lastSeenAgo } from "../../lib/format.js";

// A small profile card shown when a user's name or avatar is clicked in the
// channel feed. It only displays data already on the client (the message author
// object plus the presence map), so it needs no network call of its own.
//
// Positioning: the card is fixed to the viewport, anchored near the element
// that was clicked (passed as `anchorRect`), and nudged back on-screen if it
// would overflow the right or bottom edge.
export default function UserPopover({ user, presence, anchorRect, onMessage, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: -9999, left: -9999 });

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Place the card after it renders, so we can measure its real size and keep
  // it within the viewport.
  useEffect(() => {
    if (!ref.current || !anchorRect) return;
    const card = ref.current.getBoundingClientRect();
    const margin = 8;
    let left = anchorRect.left;
    let top = anchorRect.bottom + 6;
    if (left + card.width + margin > window.innerWidth) {
      left = window.innerWidth - card.width - margin;
    }
    if (left < margin) left = margin;
    if (top + card.height + margin > window.innerHeight) {
      // Flip above the anchor if there's no room below.
      top = Math.max(margin, anchorRect.top - card.height - 6);
    }
    setPos({ top, left });
  }, [anchorRect]);

  if (!user) return null;

  const pres = presence?.[user.id];
  const online = !!pres?.online;
  const status = online
    ? "Online"
    : pres?.last_seen
    ? `Last seen ${lastSeenAgo(pres.last_seen)}`
    : "Offline";

  return (
    <div
      ref={ref}
      className="user-popover"
      style={{ top: pos.top, left: pos.left }}
      role="dialog"
    >
      <button className="user-popover-close" onClick={onClose} aria-label="Close">
        <Icon name="x" size={16} />
      </button>

      <div className="user-popover-top">
        <Avatar user={user} size={72} online={online} />
        <div className={`user-popover-status ${online ? "is-online" : ""}`}>{status}</div>
      </div>

      <div className="user-popover-name">{displayName(user)}</div>
      <div className="user-popover-handle">@{user.username}</div>

      {user.email && (
        <a className="user-popover-email" href={`mailto:${user.email}`} title={user.email}>
          <Icon name="at" size={15} />
          <span>{user.email}</span>
        </a>
      )}

      {onMessage && (
        <button className="btn btn-primary user-popover-message" onClick={() => onMessage(user)}>
          <Icon name="send" size={16} />
          <span>Message</span>
        </button>
      )}
    </div>
  );
}
