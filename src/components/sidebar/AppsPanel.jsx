import { useEffect, useRef, useState } from "react";
import { api } from "../../api/endpoints.js";
import Icon from "../common/Icon.jsx";
import AppIcon from "../common/AppIcon.jsx";

// Apps launcher in the workspace rail: a button that expands a vertical list of
// admin-curated bookmarks. Clicking a bookmark opens it in a new tab and
// collapses the panel; clicking outside or pressing Escape also collapses it.
export default function AppsPanel({ links }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Close on outside click or Escape while open.
  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openLink(url) {
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <div className="rail-apps" ref={wrapRef}>
      {open && (
        <div className="rail-apps-list" role="menu" aria-label="Apps">
          {links.length === 0 ? (
            <div className="rail-apps-empty">No apps yet</div>
          ) : (
            links.map((l) => (
              <button
                key={l.id}
                className="rail-apps-item"
                onClick={() => openLink(l.url)}
                title={l.name}
                role="menuitem"
              >
                <AppIcon url={l.url} name={l.name} size={22} />
              </button>
            ))
          )}
        </div>
      )}
      <button
        className={`rail-btn rail-apps-btn ${open ? "active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title={open ? "Close apps" : "Apps"}
        aria-expanded={open}
        aria-label="Apps"
      >
        <Icon name={open ? "x" : "grid"} size={22} strokeWidth={2} />
        <span className="rail-btn-label">Apps</span>
      </button>
    </div>
  );
}
