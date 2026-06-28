import { useState } from "react";
import { api } from "../../api/endpoints.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { displayName } from "../../lib/format.js";
import { Modal, RoleBadge } from "../common/Modal.jsx";
import Avatar from "../common/Avatar.jsx";
import Icon from "../common/Icon.jsx";

export default function ProfileModal({ onClose, onOpenSettings }) {
  const { user, setUser, logout } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user.display_name || "");
  const [avatar, setAvatar] = useState(user.avatar_url || "");
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = await api.updateMe({
        display_name: name.trim() || undefined,
        avatar_url: avatar.trim() || undefined,
      });
      setUser(updated);
      toast.success("Profile updated");
      onClose();
    } catch (err) {
      toast.error("Couldn't save profile", err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Your profile" onClose={onClose}>
      <div className="profile-head">
        <Avatar user={{ ...user, display_name: name, avatar_url: avatar }} size={64} />
        <div className="profile-head-meta">
          <div className="profile-head-name">
            {displayName(user)} <RoleBadge role={user.role} />
          </div>
          <div className="muted">@{user.username}</div>
          <div className="muted profile-head-email">{user.email}</div>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-icon profile-settings-btn"
          onClick={onOpenSettings}
          title="Settings"
          aria-label="Settings"
        >
          <Icon name="settings" size={20} />
        </button>
      </div>

      <form onSubmit={save} className="form">
        <div className="field">
          <label className="field-label">Display name</label>
          <input className="input" value={name} maxLength={64} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">Avatar URL <span className="muted">(optional)</span></label>
          <input className="input" value={avatar} placeholder="https://…/avatar.png" onChange={(e) => setAvatar(e.target.value)} />
        </div>

        <div className="form-actions" style={{ justifyContent: "space-between" }}>
          <button type="button" className="btn btn-danger" onClick={logout}>
            <Icon name="logout" size={16} /> Sign out
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? <span className="spinner on-brand" /> : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
