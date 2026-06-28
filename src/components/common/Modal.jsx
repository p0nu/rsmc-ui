import { useEffect } from "react";
import Icon from "./Icon.jsx";

export function Modal({ title, subtitle, onClose, children, footer, width = 480 }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        style={{ width }}
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <div className="modal-heading">
            <h2>{title}</h2>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </header>
        <div className="modal-content">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>
  );
}

export function RoleBadge({ role }) {
  const map = {
    admin: { cls: "badge-admin", label: "Admin" },
    member: { cls: "", label: "Member" },
    guest: { cls: "badge-guest", label: "Guest" },
    owner: { cls: "badge-owner", label: "Owner" },
  };
  const m = map[role] || { cls: "", label: role };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

export function Loading({ label }) {
  return (
    <div className="loading-block">
      <div className="spinner" />
      {label && <span className="muted">{label}</span>}
    </div>
  );
}

export function EmptyState({ icon, title, hint, action }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3>{title}</h3>
      {hint && <p className="muted">{hint}</p>}
      {action}
    </div>
  );
}
