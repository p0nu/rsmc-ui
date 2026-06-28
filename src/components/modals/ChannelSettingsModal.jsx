import { useState } from "react";
import { api } from "../../api/endpoints.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { slugifyChannel } from "../../lib/format.js";
import { Modal } from "../common/Modal.jsx";
import Icon from "../common/Icon.jsx";

export default function ChannelSettingsModal({ channel, canAdminister, onClose, onUpdated, onLeft }) {
  const { user } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(channel.name || "");
  const [topic, setTopic] = useState(channel.topic || "");
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    if (!canAdminister) return;
    setBusy(true);
    try {
      await api.updateChannel(channel.id, { name: name.trim(), topic: topic.trim() });
      toast.success("Channel updated");
      onUpdated?.();
    } catch (err) {
      toast.error("Couldn't update channel", err.message);
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    if (!confirm(`Leave #${channel.name}? You'll need to be re-added to rejoin.`)) return;
    try {
      await api.removeMember(channel.id, user.id);
      toast.info("You left the channel", `#${channel.name}`);
      onLeft?.();
    } catch (e) {
      toast.error("Couldn't leave channel", e.message);
    }
  }

  return (
    <Modal title="Channel settings" subtitle={`#${channel.name}`} onClose={onClose}>
      <form onSubmit={save} className="form">
        <div className="field">
          <label className="field-label">Name</label>
          <div className="input-prefix">
            <span className="input-prefix-glyph"><Icon name="hash" size={16} /></span>
            <input
              className="input"
              value={name}
              disabled={!canAdminister}
              onChange={(e) => setName(slugifyChannel(e.target.value))}
              style={{ paddingLeft: 34 }}
            />
          </div>
        </div>
        <div className="field">
          <label className="field-label">Topic</label>
          <textarea
            className="textarea"
            value={topic}
            disabled={!canAdminister}
            placeholder="Add a topic to describe this channel"
            onChange={(e) => setTopic(e.target.value)}
            style={{ minHeight: 70 }}
          />
        </div>

        {!canAdminister && (
          <div className="panel-note">
            <Icon name="alert" size={16} />
            <span>Only the channel owner or a channel admin can edit these settings.</span>
          </div>
        )}

        <div className="form-actions" style={{ justifyContent: "space-between" }}>
          <button type="button" className="btn btn-danger" onClick={leave}>
            Leave channel
          </button>
          {canAdminister && (
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? <span className="spinner on-brand" /> : "Save changes"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
