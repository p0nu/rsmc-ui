import { useEffect, useRef, useState } from "react";
import { api } from "../../api/endpoints.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { displayName } from "../../lib/format.js";
import Avatar from "../common/Avatar.jsx";
import Icon from "../common/Icon.jsx";
import { Loading } from "../common/Modal.jsx";

export default function MembersPanel({ channel, members, presence, canAdminister, onClose, onChanged }) {
  const { user } = useAuth();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const debounce = useRef(null);

  const memberIds = new Set(members.map((m) => m.id));

  // Channel members may include people who aren't DM peers, so the shared
  // presence map won't have seeded them. Fetch their current status when the
  // panel opens (and when the roster changes) and merge it over the prop.
  const [localPresence, setLocalPresence] = useState({});
  useEffect(() => {
    const ids = members.map((m) => m.id);
    if (ids.length === 0) return;
    let cancelled = false;
    api
      .bulkPresence(ids)
      .then((rows) => {
        if (cancelled) return;
        const next = {};
        for (const r of rows) next[r.user_id] = { online: r.online, last_seen: r.last_seen };
        setLocalPresence(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [members]);

  const presenceFor = (id) => presence[id]?.online ?? localPresence[id]?.online;

  useEffect(() => {
    if (!canAdminister) return;
    clearTimeout(debounce.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      try {
        const list = await api.listUsers(query.trim(), 15);
        setResults(list.filter((u) => !memberIds.has(u.id)));
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => clearTimeout(debounce.current);
  }, [query, canAdminister, members]);

  async function add(u) {
    setBusyId(u.id);
    try {
      await api.addMember(channel.id, u.id);
      toast.success("Added to channel", displayName(u));
      setQuery("");
      setResults([]);
      await onChanged?.();
    } catch (e) {
      toast.error("Couldn't add member", e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(u) {
    const self = u.id === user.id;
    if (!confirm(self ? `Leave #${channel.name}?` : `Remove ${displayName(u)} from #${channel.name}?`)) return;
    setBusyId(u.id);
    try {
      await api.removeMember(channel.id, u.id);
      await onChanged?.();
    } catch (e) {
      toast.error("Couldn't remove member", e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <aside className="rightpanel">
      <header className="rightpanel-head">
        <div className="rightpanel-title">
          <h3>Members</h3>
          <span className="muted">{members.length} in this channel</span>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">
          <Icon name="x" size={18} />
        </button>
      </header>

      <div className="rightpanel-body">
        {canAdminister ? (
          <div className="members-add">
            <div className="input-with-icon">
              <Icon name="search" size={16} className="input-icon" />
              <input
                className="input"
                placeholder="Add people by name or username…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ paddingLeft: 36 }}
              />
            </div>
            {query.trim() && (
              <div className="members-results">
                {searching ? (
                  <div className="members-results-loading"><span className="spinner" /></div>
                ) : results.length === 0 ? (
                  <div className="members-results-empty muted">No people found to add.</div>
                ) : (
                  results.map((u) => (
                    <button key={u.id} className="members-result" onClick={() => add(u)} disabled={busyId === u.id}>
                      <Avatar user={u} size={30} />
                      <span className="members-result-meta">
                        <span className="members-result-name">{displayName(u)}</span>
                        <span className="members-result-handle">@{u.username}</span>
                      </span>
                      {busyId === u.id ? <span className="spinner" /> : <Icon name="plus" size={16} />}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="panel-note">
            <Icon name="alert" size={16} />
            <span>Only the channel owner or a channel admin can add or remove members.</span>
          </div>
        )}

        <div className="members-list">
          {members.map((m) => {
            const me = m.id === user.id;
            const online = me ? true : presenceFor(m.id);
            const isOwner = channel.created_by === m.id;
            const canRemove = me || canAdminister;
            return (
              <div key={m.id} className="member-row">
                <Avatar user={m} size={36} online={!!online} />
                <div className="member-info">
                  <div className="member-name">
                    {displayName(m)}
                    {me && <span className="member-you">you</span>}
                  </div>
                  <div className="member-sub">
                    @{m.username}
                    {isOwner && <span className="badge badge-owner" style={{ marginLeft: 6 }}>Owner</span>}
                    {m.role === "admin" && <span className="badge badge-admin" style={{ marginLeft: 6 }}>Admin</span>}
                  </div>
                </div>
                {canRemove && !isOwner && (
                  <button
                    className="member-remove"
                    onClick={() => remove(m)}
                    disabled={busyId === m.id}
                    title={me ? "Leave channel" : "Remove from channel"}
                  >
                    {me ? "Leave" : <Icon name="x" size={16} />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
