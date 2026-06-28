import { useEffect, useRef, useState } from "react";
import { api } from "../../api/endpoints.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { displayName } from "../../lib/format.js";
import { Modal, Loading } from "../common/Modal.jsx";
import Avatar from "../common/Avatar.jsx";
import Icon from "../common/Icon.jsx";

export default function NewDirectModal({ onClose, onStarted }) {
  const { user } = useAuth();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const debounce = useRef(null);

  useEffect(() => {
    clearTimeout(debounce.current);
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        const list = await api.listUsers(query.trim(), 25);
        setResults(list.filter((u) => u.id !== user.id));
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(debounce.current);
  }, [query, user.id]);

  async function start(u) {
    setBusyId(u.id);
    try {
      const ch = await api.createDirect(u.id);
      onStarted({ ...ch, peer: u });
    } catch (e) {
      toast.error("Couldn't start conversation", e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Modal title="New direct message" subtitle="Search for someone to start a private conversation." onClose={onClose}>
      <div className="input-with-icon">
        <Icon name="search" size={16} className="input-icon" />
        <input
          className="input"
          autoFocus
          placeholder="Search people…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ paddingLeft: 36 }}
        />
      </div>

      <div className="user-picker">
        {loading ? (
          <Loading />
        ) : results.length === 0 ? (
          <p className="muted user-picker-empty">No people found.</p>
        ) : (
          results.map((u) => (
            <button key={u.id} className="user-picker-row" onClick={() => start(u)} disabled={busyId === u.id}>
              <Avatar user={u} size={36} />
              <span className="user-picker-meta">
                <span className="user-picker-name">{displayName(u)}</span>
                <span className="user-picker-handle">@{u.username}</span>
              </span>
              {busyId === u.id ? <span className="spinner" /> : <Icon name="message" size={17} />}
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}
