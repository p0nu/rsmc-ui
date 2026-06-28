import { useEffect, useState } from "react";
import { api } from "../../api/endpoints.js";
import { useToast } from "../../context/ToastContext.jsx";
import { timeAgo } from "../../lib/format.js";
import Icon from "../common/Icon.jsx";
import { Loading, EmptyState } from "../common/Modal.jsx";

const EVENT_OPTIONS = [
  { value: "message.created", label: "Message created", hint: "A new message is posted" },
  { value: "message.updated", label: "Message updated", hint: "A message is edited" },
  { value: "message.deleted", label: "Message deleted", hint: "A message is removed" },
];

export default function AdminWebhooks() {
  const toast = useToast();
  const [hooks, setHooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // form state
  const [targetUrl, setTargetUrl] = useState("");
  const [events, setEvents] = useState(["message.created"]);
  const [submitting, setSubmitting] = useState(false);

  // one-time secret reveal after creation
  const [revealed, setRevealed] = useState(null); // { id, target_url, events, secret }
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setHooks(await api.listWebhooks());
    } catch (e) {
      toast.error("Couldn't load webhooks", e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggleEvent(value) {
    setEvents((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function resetForm() {
    setTargetUrl("");
    setEvents(["message.created"]);
    setCreating(false);
  }

  async function submit() {
    const url = targetUrl.trim();
    if (!url) {
      toast.error("Endpoint URL required");
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      toast.error("Enter a valid URL", "Must start with http:// or https://");
      return;
    }
    if (events.length === 0) {
      toast.error("Pick at least one event");
      return;
    }
    setSubmitting(true);
    try {
      // Global (workspace-wide) webhook — requires system admin. Channel-scoped
      // webhooks are created from a channel's settings instead.
      const created = await api.createWebhook({ target_url: url, events });
      setRevealed(created);
      setCopied(false);
      resetForm();
      load();
      toast.success("Webhook created", "Copy the signing secret now — it won't be shown again.");
    } catch (e) {
      toast.error("Couldn't create webhook", e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(hook) {
    if (!confirm(`Delete this webhook?\n\n${hook.target_url}\n\nDeliveries to this endpoint will stop immediately.`)) {
      return;
    }
    setBusyId(hook.id);
    try {
      await api.deleteWebhook(hook.id);
      setHooks((hs) => hs.filter((h) => h.id !== hook.id));
      if (revealed?.id === hook.id) setRevealed(null);
      toast.info("Webhook deleted");
    } catch (e) {
      toast.error("Couldn't delete webhook", e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function copySecret() {
    if (!revealed?.secret) return;
    try {
      await navigator.clipboard.writeText(revealed.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy", "Select the secret and copy it manually.");
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-toolbar">
        <div>
          <h2 className="admin-subtitle">Outgoing webhooks</h2>
          <p className="muted">
            Send signed HTTP callbacks to your services when messages change. Each
            request includes an <code>X-Signature</code> HMAC header.
          </p>
        </div>
        {!creating && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} /> New webhook
          </button>
        )}
      </div>

      {revealed && (
        <div className="webhook-secret">
          <div className="webhook-secret-head">
            <Icon name="check" size={18} />
            <strong>Webhook created — save your signing secret</strong>
          </div>
          <p className="muted">
            This is the only time the secret will be shown. Use it to verify the
            signature on incoming deliveries.
          </p>
          <div className="webhook-secret-row">
            <code className="webhook-secret-value">{revealed.secret}</code>
            <button className="btn btn-secondary btn-sm" onClick={copySecret}>
              <Icon name={copied ? "check" : "copy"} size={15} />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setRevealed(null)}>
            Dismiss
          </button>
        </div>
      )}

      {creating && (
        <div className="webhook-form">
          <div className="field">
            <label>Endpoint URL</label>
            <input
              className="input"
              placeholder="https://example.com/hooks/rsmc"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              autoFocus
            />
            <span className="field-hint">We'll POST a JSON payload here for each selected event.</span>
          </div>

          <div className="field">
            <label>Trigger events</label>
            <div className="webhook-events">
              {EVENT_OPTIONS.map((opt) => (
                <label key={opt.value} className="webhook-event">
                  <input
                    type="checkbox"
                    checked={events.includes(opt.value)}
                    onChange={() => toggleEvent(opt.value)}
                  />
                  <span className="webhook-event-body">
                    <span className="webhook-event-label">{opt.label}</span>
                    <span className="webhook-event-hint">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-ghost" onClick={resetForm} disabled={submitting}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? "Creating…" : "Create webhook"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <Loading />
      ) : hooks.length === 0 && !creating ? (
        <EmptyState
          icon={<Icon name="webhook" size={40} />}
          title="No webhooks yet"
          hint="Create a webhook to forward workspace message events to your own services."
        />
      ) : (
        <div className="webhook-list">
          {hooks.map((h) => (
            <div key={h.id} className="webhook-item">
              <div className="webhook-item-icon">
                <Icon name="webhook" size={18} />
              </div>
              <div className="webhook-item-body">
                <div className="webhook-item-url">{h.target_url}</div>
                <div className="webhook-item-meta">
                  <span className="webhook-scope">
                    {h.channel_id ? "Channel-scoped" : "Workspace-wide"}
                  </span>
                  {(h.events || []).map((ev) => (
                    <span key={ev} className="webhook-event-tag">{ev}</span>
                  ))}
                  {h.created_at && <span className="muted">· added {timeAgo(h.created_at)}</span>}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => remove(h)}
                disabled={busyId === h.id}
                aria-label="Delete webhook"
                title="Delete webhook"
              >
                <Icon name="trash" size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
