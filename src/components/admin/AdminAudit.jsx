import { useEffect, useState } from "react";
import { api } from "../../api/endpoints.js";

// Admin audit log viewer: shows recent security-relevant actions recorded by
// the engine (role changes, activate/deactivate, MFA, account deletion).
export default function AdminAudit() {
  const [events, setEvents] = useState(null);
  const [filter, setFilter] = useState("");

  async function load(action) {
    setEvents(null);
    try {
      const res = await api.auditLog({ limit: 100, action: action || undefined });
      setEvents(res.events || []);
    } catch {
      setEvents([]);
    }
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="admin-audit">
      <div className="admin-audit-head">
        <h3>Audit log</h3>
        <div className="admin-audit-filter">
          <input
            className="input"
            placeholder="Filter by action (e.g. role.changed)"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(filter.trim())}
          />
          <button className="btn btn-ghost btn-sm" onClick={() => load(filter.trim())}>
            Apply
          </button>
        </div>
      </div>

      {events === null ? (
        <p className="muted">Loading...</p>
      ) : events.length === 0 ? (
        <p className="muted">No audit events.</p>
      ) : (
        <div className="admin-table audit-table">
          <div className="admin-table-head">
            <div>When</div>
            <div>Action</div>
            <div>Actor</div>
            <div>Target</div>
            <div>Details</div>
          </div>
          {events.map((e) => (
            <div key={e.id} className="admin-row">
              <div className="admin-cell muted">{new Date(e.created_at).toLocaleString()}</div>
              <div className="admin-cell"><code>{e.action}</code></div>
              <div className="admin-cell">{e.actor_label}</div>
              <div className="admin-cell">{e.target_label || "-"}</div>
              <div className="admin-cell muted audit-meta">
                {e.metadata && Object.keys(e.metadata).length > 0
                  ? JSON.stringify(e.metadata)
                  : "-"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
