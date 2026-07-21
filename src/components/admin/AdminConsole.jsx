import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { isAdmin } from "../../lib/permissions.js";
import AdminOverview from "./AdminOverview.jsx";
import AdminMembers from "./AdminMembers.jsx";
import AdminBackup from "./AdminBackup.jsx";
import AdminIntegrations from "./AdminIntegrations.jsx";
import { EmptyState } from "../common/Modal.jsx";
import Icon from "../common/Icon.jsx";

export default function AdminConsole({ onAppLinksChanged }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");

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
          <p className="muted">
            Monitor the deployment, manage members, protect your data, and connect
            other systems.
          </p>
        </div>
      </header>

      <div className="admin-tabs">
        <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>
          <Icon name="grid" size={17} /> Overview
        </button>
        <button className={tab === "members" ? "active" : ""} onClick={() => setTab("members")}>
          <Icon name="users" size={17} /> Members &amp; roles
        </button>
        <button className={tab === "backup" ? "active" : ""} onClick={() => setTab("backup")}>
          <Icon name="download" size={17} /> Backup &amp; restore
        </button>
        <button
          className={tab === "integrations" ? "active" : ""}
          onClick={() => setTab("integrations")}
        >
          <Icon name="webhook" size={17} /> Integrations
        </button>
      </div>

      <div className="admin-body">
        {tab === "overview" && <AdminOverview />}
        {tab === "members" && <AdminMembers />}
        {tab === "backup" && <AdminBackup />}
        {tab === "integrations" && <AdminIntegrations onAppLinksChanged={onAppLinksChanged} />}
      </div>
    </div>
  );
}
