import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { isAdmin } from "../../lib/permissions.js";
import AdminMembers from "./AdminMembers.jsx";
import AdminWebhooks from "./AdminWebhooks.jsx";
import AdminSystem from "./AdminSystem.jsx";
import AdminAppLinks from "./AdminAppLinks.jsx";
import { EmptyState } from "../common/Modal.jsx";
import Icon from "../common/Icon.jsx";

export default function AdminConsole({ onAppLinksChanged }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("members");

  if (!isAdmin(user)) {
    return (
      <div className="admin">
        <div className="main-empty">
          <EmptyState
            icon={<Icon name="shield" size={40} />}
            title="Admin access required"
            hint="Only workspace admins can open the admin console."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="admin">
      <header className="admin-header">
        <div>
          <h1 className="admin-title">Admin console</h1>
          <p className="muted">Manage members, roles, and integrations for your workspace.</p>
        </div>
      </header>

      <div className="admin-tabs">
        <button className={tab === "members" ? "active" : ""} onClick={() => setTab("members")}>
          <Icon name="users" size={17} /> Members & roles
        </button>
        <button className={tab === "webhooks" ? "active" : ""} onClick={() => setTab("webhooks")}>
          <Icon name="webhook" size={17} /> Integrations
        </button>
        <button className={tab === "apps" ? "active" : ""} onClick={() => setTab("apps")}>
          <Icon name="grid" size={17} /> Apps
        </button>
        <button className={tab === "system" ? "active" : ""} onClick={() => setTab("system")}>
          <Icon name="settings" size={17} /> System
        </button>
      </div>

      <div className="admin-body">
        {tab === "members" && <AdminMembers />}
        {tab === "webhooks" && <AdminWebhooks />}
        {tab === "apps" && <AdminAppLinks onChanged={onAppLinksChanged} />}
        {tab === "system" && <AdminSystem />}
      </div>
    </div>
  );
}
