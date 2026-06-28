import { useConnectionStatus } from "../../hooks/useRealtime.js";
import { isAdmin } from "../../lib/permissions.js";
import Avatar from "../common/Avatar.jsx";
import Icon from "../common/Icon.jsx";
import Logo from "../common/Logo.jsx";
import AppsPanel from "./AppsPanel.jsx";

export default function WorkspaceRail({ user, view, unread, appLinks = [], onChat, onAdmin, onProfile }) {
  const status = useConnectionStatus();
  const connected = status === "open";

  return (
    <nav className="rail" aria-label="Workspace">
      <button className="rail-logo" onClick={onChat} title="RSMC" aria-label="RSMC home">
        <Logo size={34} />
      </button>

      <div className="rail-nav">
        <RailButton
          icon="message"
          label="Chat"
          active={view === "chat"}
          badge={unread}
          onClick={onChat}
        />
        {isAdmin(user) && (
          <RailButton icon="shield" label="Admin" active={view === "admin"} onClick={onAdmin} />
        )}
      </div>

      <div className="rail-foot">
        <AppsPanel links={appLinks} />
        <button
          className="rail-avatar"
          onClick={onProfile}
          title={connected ? "Your profile — connected" : `Your profile — connection: ${status}`}
          aria-label="Your profile"
        >
          <Avatar user={user} size={34} online={connected} />
        </button>
      </div>
    </nav>
  );
}

function RailButton({ icon, label, active, badge, onClick }) {
  return (
    <button className={`rail-btn ${active ? "active" : ""}`} onClick={onClick} title={label}>
      <Icon name={icon} size={22} strokeWidth={2} />
      <span className="rail-btn-label">{label}</span>
      {badge > 0 && <span className="rail-btn-badge">{badge > 99 ? "99+" : badge}</span>}
    </button>
  );
}
