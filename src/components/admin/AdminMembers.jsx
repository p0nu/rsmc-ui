import { useEffect, useState, useRef } from "react";
import { api } from "../../api/endpoints.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { displayName, timeAgo } from "../../lib/format.js";
import { SYSTEM_ROLES, roleLabel } from "../../lib/permissions.js";
import Avatar from "../common/Avatar.jsx";
import Icon from "../common/Icon.jsx";
import { Loading } from "../common/Modal.jsx";

export default function AdminMembers() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);
  const debounce = useRef(null);

  async function load(q = "") {
    setLoading(true);
    try {
      setUsers(await api.listUsers(q, 200));
    } catch (e) {
      toast.error("Couldn't load members", e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(query.trim()), 250);
    return () => clearTimeout(debounce.current);
  }, [query]);

  async function changeRole(u, role) {
    setBusyId(u.id);
    try {
      const updated = await api.setRole(u.id, role);
      setUsers((us) => us.map((x) => (x.id === u.id ? updated : x)));
      if (u.id === user.id) setUser(updated);
      toast.success("Role updated", `${displayName(u)} is now ${roleLabel(role)}`);
    } catch (e) {
      toast.error("Couldn't change role", e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function setActive(u, active) {
    const verb = active ? "Reactivate" : "Deactivate";
    const msg = active
      ? `Reactivate ${displayName(u)}? They'll be able to sign in again.`
      : `Deactivate ${displayName(u)}? They won't be able to sign in, and any active sessions are ended. History is preserved.`;
    if (!confirm(msg)) return;
    setBusyId(u.id);
    try {
      const updated = active ? await api.activate(u.id) : await api.deactivate(u.id);
      setUsers((us) => us.map((x) => (x.id === u.id ? updated : x)));
      if (u.id === user.id) setUser(updated);
      toast.info(active ? "Account reactivated" : "Account deactivated", displayName(u));
    } catch (e) {
      toast.error(`Couldn't ${verb.toLowerCase()}`, e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-toolbar">
        <div className="input-with-icon" style={{ maxWidth: 320 }}>
          <Icon name="search" size={16} className="input-icon" />
          <input
            className="input"
            placeholder="Search members…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <span className="muted">{users.length} members</span>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="admin-table">
          <div className="admin-table-head">
            <span>Member</span>
            <span>Status</span>
            <span>Joined</span>
            <span>Role</span>
            <span />
          </div>
          {users.map((u) => (
            <div key={u.id} className="admin-row">
              <div className="admin-cell admin-cell-user">
                <Avatar user={u} size={36} />
                <div className="admin-user-meta">
                  <div className="admin-user-name">
                    {displayName(u)}
                    {u.id === user.id && <span className="member-you">you</span>}
                  </div>
                  <div className="admin-user-handle">@{u.username} · {u.email}</div>
                </div>
              </div>
              <div className="admin-cell">
                {u.is_active ? (
                  <span className="badge badge-success">Active</span>
                ) : (
                  <span className="badge badge-danger">Deactivated</span>
                )}
              </div>
              <div className="admin-cell muted">{timeAgo(u.created_at)}</div>
              <div className="admin-cell">
                <select
                  className="select admin-role-select"
                  value={u.role}
                  disabled={busyId === u.id || u.id === user.id}
                  title={u.id === user.id ? "You can't change your own role" : undefined}
                  onChange={(e) => changeRole(u, e.target.value)}
                >
                  {SYSTEM_ROLES.map((r) => (
                    <option key={r} value={r}>{roleLabel(r)}</option>
                  ))}
                </select>
              </div>
              <div className="admin-cell admin-cell-actions">
                {u.id !== user.id &&
                  (u.is_active ? (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setActive(u, false)}
                      disabled={busyId === u.id}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setActive(u, true)}
                      disabled={busyId === u.id}
                    >
                      Reactivate
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
