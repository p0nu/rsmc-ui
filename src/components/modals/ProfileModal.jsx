import { useRef, useState } from "react";
import { api } from "../../api/endpoints.js";
import { ApiError } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { displayName } from "../../lib/format.js";
import { Modal, RoleBadge } from "../common/Modal.jsx";
import Avatar from "../common/Avatar.jsx";
import Icon from "../common/Icon.jsx";

// Preset statuses for one-tap selection.
const STATUS_PRESETS = [
  { emoji: "💬", text: "Available" },
  { emoji: "🎯", text: "Focusing" },
  { emoji: "📅", text: "In a meeting" },
  { emoji: "🍽️", text: "Out for lunch" },
  { emoji: "🏝️", text: "On vacation" },
  { emoji: "🤒", text: "Out sick" },
];

export default function ProfileModal({ onClose, onOpenSettings }) {
  const { user, setUser, logout } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user.display_name || "");
  const [busy, setBusy] = useState(false);

  // Avatar upload state (Feature 8): reflects the current uploaded avatar.
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || "");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileRef = useRef(null);

  // Status state (Feature 4).
  const [statusEmoji, setStatusEmoji] = useState(user.status_emoji || "");
  const [statusText, setStatusText] = useState(user.status_text || "");
  const [statusBusy, setStatusBusy] = useState(false);

  // Email account management (verification + change).
  const [newEmail, setNewEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const verified = user?.email_verified;

  async function requestEmailChange(e) {
    e.preventDefault();
    setEmailBusy(true);
    try {
      await api.requestEmailChange(newEmail.trim());
      toast.success("Confirm your new email", "We sent a confirmation link to the new address.");
      setNewEmail("");
    } catch (err) {
      toast.error("Couldn't change email", err instanceof ApiError ? err.message : "Try again.");
    } finally {
      setEmailBusy(false);
    }
  }

  async function resendVerification() {
    setEmailBusy(true);
    try {
      await api.sendVerification();
      toast.success("Verification sent", "Check your inbox for the verification link.");
    } catch (err) {
      toast.error("Couldn't send verification", err instanceof ApiError ? err.message : "Try again.");
    } finally {
      setEmailBusy(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = await api.updateMe({
        display_name: name.trim() || undefined,
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

  async function pickAvatar(e) {
    const file = (e.target.files || [])[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Not an image", "Please choose an image file.");
      return;
    }
    setAvatarBusy(true);
    try {
      const updated = await api.uploadAvatar(file);
      setAvatarUrl(updated.avatar_url || "");
      setUser(updated);
      toast.success("Avatar updated");
    } catch (err) {
      toast.error("Couldn't upload avatar", err.message);
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    try {
      const updated = await api.deleteAvatar();
      setAvatarUrl("");
      setUser(updated);
      toast.success("Avatar removed");
    } catch (err) {
      toast.error("Couldn't remove avatar", err.message);
    } finally {
      setAvatarBusy(false);
    }
  }

  async function saveStatus(emoji, text) {
    setStatusBusy(true);
    try {
      const updated = await api.setStatus({
        emoji: emoji || undefined,
        text: text || undefined,
      });
      setStatusEmoji(updated.status_emoji || "");
      setStatusText(updated.status_text || "");
      setUser(updated);
    } catch (err) {
      toast.error("Couldn't update status", err.message);
    } finally {
      setStatusBusy(false);
    }
  }

  async function clearStatus() {
    setStatusBusy(true);
    try {
      const updated = await api.setStatus({});
      setStatusEmoji("");
      setStatusText("");
      setUser(updated);
    } catch (err) {
      toast.error("Couldn't clear status", err.message);
    } finally {
      setStatusBusy(false);
    }
  }

  const previewUser = { ...user, display_name: name, avatar_url: avatarUrl };

  return (
    <Modal title="Your profile" onClose={onClose}>
      <div className="profile-head">
        <div className="profile-avatar-wrap">
          <Avatar user={previewUser} size={64} />
          <button
            type="button"
            className="profile-avatar-edit"
            onClick={() => fileRef.current?.click()}
            disabled={avatarBusy}
            title="Change avatar"
            aria-label="Change avatar"
          >
            {avatarBusy ? <span className="spinner" /> : <Icon name="camera" size={15} />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickAvatar} />
        </div>
        <div className="profile-head-meta">
          <div className="profile-head-name">
            {displayName(user)} <RoleBadge role={user.role} />
          </div>
          <div className="muted">@{user.username}</div>
          <div className="muted profile-head-email">{user.email}</div>
          {avatarUrl && (
            <button
              type="button"
              className="btn btn-ghost btn-sm profile-avatar-remove"
              onClick={removeAvatar}
              disabled={avatarBusy}
            >
              Remove photo
            </button>
          )}
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

      <div className="field">
        <label className="field-label">Status</label>
        <div className="status-editor">
          <div className="status-editor-row">
            <input
              className="input status-emoji-input"
              value={statusEmoji}
              maxLength={8}
              placeholder="😀"
              onChange={(e) => setStatusEmoji(e.target.value)}
              aria-label="Status emoji"
            />
            <input
              className="input status-text-input"
              value={statusText}
              maxLength={100}
              placeholder="What's your status?"
              onChange={(e) => setStatusText(e.target.value)}
              aria-label="Status text"
            />
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => saveStatus(statusEmoji.trim(), statusText.trim())}
              disabled={statusBusy}
            >
              {statusBusy ? <span className="spinner" /> : "Set"}
            </button>
            {(statusEmoji || statusText) && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={clearStatus}
                disabled={statusBusy}
              >
                Clear
              </button>
            )}
          </div>
          <div className="status-presets">
            {STATUS_PRESETS.map((p) => (
              <button
                key={p.text}
                type="button"
                className="status-preset"
                onClick={() => {
                  setStatusEmoji(p.emoji);
                  setStatusText(p.text);
                  saveStatus(p.emoji, p.text);
                }}
                disabled={statusBusy}
              >
                <span className="status-preset-emoji">{p.emoji}</span>
                <span>{p.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={save} className="form">
        <div className="field">
          <label className="field-label">Display name</label>
          <input className="input" value={name} maxLength={64} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="field">
          <label className="field-label">Email</label>
          <div className="profile-email-row">
            <span>{user?.email}</span>
            {verified === false && (
              <button type="button" className="btn btn-secondary btn-sm"
                disabled={emailBusy} onClick={resendVerification}>
                Resend verification
              </button>
            )}
            {verified === true && <span className="badge badge-success">Verified</span>}
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="profile-new-email">Change email</label>
          <div className="profile-email-change">
            <input
              id="profile-new-email" className="input" type="email"
              value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => {
                // Enter here should send the confirmation, not submit the
                // surrounding display-name form.
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (newEmail.trim() && !emailBusy) requestEmailChange(e);
                }
              }}
              placeholder="new@company.com"
            />
            <button
              type="button" className="btn btn-secondary"
              disabled={emailBusy || !newEmail.trim()}
              onClick={requestEmailChange}
            >
              {emailBusy ? <span className="spinner" /> : "Send confirmation"}
            </button>
          </div>
          <span className="field-hint">
            We'll send a confirmation link to the new address. Your email changes only after you confirm.
          </span>
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
