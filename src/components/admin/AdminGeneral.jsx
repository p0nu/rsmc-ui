import { useEffect, useState } from "react";
import { api } from "../../api/endpoints.js";
import { ApiError } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import { Loading } from "../common/Modal.jsx";

// General instance settings. Currently: how channel message authors are named.
export default function AdminGeneral() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nameDisplay, setNameDisplay] = useState("full_name");
  const [original, setOriginal] = useState("full_name");

  useEffect(() => {
    let alive = true;
    api
      .getSettings()
      .then((s) => {
        if (!alive) return;
        setNameDisplay(s.name_display);
        setOriginal(s.name_display);
      })
      .catch((e) => toast.error("Couldn't load settings", e instanceof ApiError ? e.message : "Try again."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  async function save() {
    setSaving(true);
    try {
      const s = await api.updateSettings({ name_display: nameDisplay });
      setOriginal(s.name_display);
      setNameDisplay(s.name_display);
      toast.success("Settings saved");
    } catch (e) {
      toast.error("Couldn't save", e instanceof ApiError ? e.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;

  const dirty = nameDisplay !== original;

  return (
    <div className="admin-section">
      <div className="admin-field">
        <div className="admin-field-head">
          <h3 className="admin-field-title">Name display</h3>
          <p className="admin-field-hint">
            How people are named on messages in channels. This does not change
            direct messages or the members list.
          </p>
        </div>

        <div className="admin-radio-group">
          <label className={`admin-radio ${nameDisplay === "full_name" ? "is-selected" : ""}`}>
            <input
              type="radio"
              name="name_display"
              value="full_name"
              checked={nameDisplay === "full_name"}
              onChange={() => setNameDisplay("full_name")}
            />
            <span className="admin-radio-main">Full name</span>
            <span className="admin-radio-sub">Show each person's full name (falls back to their username if unset).</span>
          </label>

          <label className={`admin-radio ${nameDisplay === "username" ? "is-selected" : ""}`}>
            <input
              type="radio"
              name="name_display"
              value="username"
              checked={nameDisplay === "username"}
              onChange={() => setNameDisplay("username")}
            />
            <span className="admin-radio-main">Username</span>
            <span className="admin-radio-sub">Show each person's @username.</span>
          </label>
        </div>
      </div>

      <div className="admin-actions">
        <button className="btn btn-primary" onClick={save} disabled={!dirty || saving}>
          {saving ? <span className="spinner on-brand" /> : "Save changes"}
        </button>
      </div>
    </div>
  );
}
