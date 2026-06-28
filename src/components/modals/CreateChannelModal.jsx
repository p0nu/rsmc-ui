import { useState } from "react";
import { api } from "../../api/endpoints.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { slugifyChannel } from "../../lib/format.js";
import { canCreateChannel } from "../../lib/permissions.js";
import { Modal } from "../common/Modal.jsx";
import Icon from "../common/Icon.jsx";

export default function CreateChannelModal({ onClose, onCreated }) {
  const { user } = useAuth();
  const toast = useToast();
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [busy, setBusy] = useState(false);

  const allowed = canCreateChannel(user);

  async function submit(e) {
    e.preventDefault();
    if (!allowed) return;
    setBusy(true);
    try {
      const ch = await api.createChannel({
        name: name.trim(),
        topic: topic.trim() || undefined,
        private: isPrivate,
      });
      onCreated(ch);
    } catch (err) {
      toast.error("Couldn't create channel", err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Create a channel" subtitle="Channels are where your team organizes conversations." onClose={onClose}>
      {!allowed ? (
        <div className="panel-note">
          <Icon name="alert" size={16} />
          <span>Your account role ({user.role}) can't create channels. Ask a workspace admin.</span>
        </div>
      ) : (
        <form onSubmit={submit} className="form">
          <div className="field">
            <label className="field-label">Name</label>
            <div className="input-prefix">
              <span className="input-prefix-glyph"><Icon name="hash" size={16} /></span>
              <input
                className="input"
                autoFocus
                required
                value={name}
                placeholder="marketing"
                onChange={(e) => setName(slugifyChannel(e.target.value))}
                style={{ paddingLeft: 34 }}
              />
            </div>
            <span className="field-hint">Lowercase letters, numbers, and dashes.</span>
          </div>

          <div className="field">
            <label className="field-label">Topic <span className="muted">(optional)</span></label>
            <input
              className="input"
              value={topic}
              placeholder="What's this channel about?"
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <button
            type="button"
            className={`switch-row ${isPrivate ? "on" : ""}`}
            onClick={() => setIsPrivate((p) => !p)}
          >
            <span className="switch">
              <span className="switch-knob" />
            </span>
            <span className="switch-text">
              <span className="switch-label"><Icon name="lock" size={14} /> Make private</span>
              <span className="switch-hint">Only invited members can view and join.</span>
            </span>
          </button>

          <div className="form-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
              {busy ? <span className="spinner on-brand" /> : "Create channel"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
