import { useEffect, useState } from "react";
import { api } from "../../api/endpoints.js";
import { useToast } from "../../context/ToastContext.jsx";
import Icon from "../common/Icon.jsx";
import AppIcon from "../common/AppIcon.jsx";
import { Loading, EmptyState } from "../common/Modal.jsx";

const MAX_LINKS = 5;

export default function AdminAppLinks({ onChanged }) {
  const toast = useToast();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setLinks(await api.listAppLinks());
    } catch (e) {
      toast.error("Couldn't load app links", e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setName("");
    setUrl("");
    setCreating(false);
  }

  async function submit() {
    const n = name.trim();
    let u = url.trim();
    if (!n) {
      toast.error("Name required");
      return;
    }
    if (!u) {
      toast.error("URL required");
      return;
    }
    // Be forgiving: prepend https:// if the admin omitted the scheme.
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    try {
      // Validate it parses as a URL before sending.
      new URL(u);
    } catch {
      toast.error("Enter a valid URL", "e.g. https://github.com/your-org");
      return;
    }
    setSubmitting(true);
    try {
      await api.createAppLink({ name: n, url: u });
      resetForm();
      await load();
      onChanged?.();
      toast.success("App added", `${n} is now available to everyone.`);
    } catch (e) {
      toast.error("Couldn't add app", e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(link) {
    if (!confirm(`Remove "${link.name}" from Apps?`)) return;
    setBusyId(link.id);
    try {
      await api.deleteAppLink(link.id);
      setLinks((ls) => ls.filter((l) => l.id !== link.id));
      onChanged?.();
      toast.info("App removed");
    } catch (e) {
      toast.error("Couldn't remove app", e.message);
    } finally {
      setBusyId(null);
    }
  }

  const atLimit = links.length >= MAX_LINKS;

  return (
    <div className="admin-panel">
      <div className="admin-toolbar">
        <div>
          <h2 className="admin-subtitle">Apps</h2>
          <p className="muted">
            Quick links to the tools your team uses (GitHub, GitLab, and more).
            They appear in the Apps menu in the sidebar for everyone, and open in
            a new tab. Up to {MAX_LINKS} apps.
          </p>
        </div>
        {!creating && !atLimit && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} /> Add app
          </button>
        )}
      </div>

      {atLimit && !creating && (
        <p className="field-hint">
          You've reached the maximum of {MAX_LINKS} apps. Remove one to add another.
        </p>
      )}

      {creating && (
        <div className="webhook-form">
          <div className="field">
            <label>Name</label>
            <input
              className="input"
              placeholder="GitHub"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoFocus
            />
            <span className="field-hint">Shown on hover over the icon.</span>
          </div>
          <div className="field">
            <label>URL</label>
            <input
              className="input"
              placeholder="https://github.com/your-org"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <span className="field-hint">
              The icon is detected from the link automatically. Unknown sites get
              a lettered tile.
            </span>
          </div>
          {url.trim() && (
            <div className="applink-preview">
              <span className="muted">Preview:</span>
              <AppIcon url={/^https?:\/\//i.test(url) ? url : `https://${url}`} name={name} size={26} />
            </div>
          )}
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={resetForm} disabled={submitting}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? "Adding…" : "Add app"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <Loading />
      ) : links.length === 0 && !creating ? (
        <EmptyState
          icon={<Icon name="grid" size={40} />}
          title="No apps yet"
          hint="Add a link to a tool your team uses — it'll show up in the Apps menu for everyone."
        />
      ) : (
        <div className="webhook-list">
          {links.map((l) => (
            <div key={l.id} className="webhook-item">
              <div className="webhook-item-icon">
                <AppIcon url={l.url} name={l.name} size={22} />
              </div>
              <div className="webhook-item-body">
                <div className="webhook-item-url">{l.name}</div>
                <div className="webhook-item-meta">
                  <span className="muted">{l.url}</span>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => remove(l)}
                disabled={busyId === l.id}
                aria-label="Remove app"
                title="Remove app"
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
