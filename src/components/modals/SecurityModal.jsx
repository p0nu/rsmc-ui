import { useEffect, useState } from "react";
import qrcode from "qrcode-generator";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { api } from "../../api/endpoints.js";
import { ApiError } from "../../api/client.js";
import { Modal } from "../common/Modal.jsx";
import Icon from "../common/Icon.jsx";

// Security & Privacy: MFA enrollment, active sessions, and GDPR data controls.
export default function SecurityModal({ onClose }) {
  const { user, setUser, logout } = useAuth();
  const toast = useToast();

  return (
    <Modal title="Security & Privacy" onClose={onClose} width={560}>
      <div className="security-sections">
        <MfaSection user={user} setUser={setUser} toast={toast} />
        <SessionsSection toast={toast} />
        <DataSection toast={toast} logout={logout} />
      </div>
    </Modal>
  );
}

// --- MFA / TOTP ---
function MfaSection({ user, setUser, toast }) {
  const enabled = !!user?.mfa_enabled;
  const [enroll, setEnroll] = useState(null); // { secret_base32, otpauth_uri }
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function begin() {
    setBusy(true);
    try {
      const res = await api.mfaEnroll();
      setEnroll(res);
    } catch (err) {
      toast.error("Couldn't start setup", err instanceof ApiError ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    try {
      await api.mfaConfirm(code.trim());
      setUser({ ...user, mfa_enabled: true });
      setEnroll(null);
      setCode("");
      toast.success("Two-factor enabled", "You'll be asked for a code at each sign-in.");
    } catch (err) {
      toast.error("Couldn't enable", err instanceof ApiError ? err.message : "Check the code and retry.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    const c = window.prompt("Enter a current authentication code to disable two-factor:");
    if (!c) return;
    setBusy(true);
    try {
      await api.mfaDisable(c.trim());
      setUser({ ...user, mfa_enabled: false });
      toast.success("Two-factor disabled");
    } catch (err) {
      toast.error("Couldn't disable", err instanceof ApiError ? err.message : "Check the code and retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="sec-block">
      <div className="sec-head">
        <Icon name="lock" size={16} />
        <div>
          <h3>Two-factor authentication</h3>
          <p className="muted">
            {enabled
              ? "Enabled. A code from your authenticator app is required at sign-in."
              : "Add a second step at sign-in using an authenticator app (TOTP)."}
          </p>
        </div>
      </div>

      {enabled ? (
        <button className="btn btn-danger-outline" onClick={disable} disabled={busy}>
          Disable two-factor
        </button>
      ) : enroll ? (
        <div className="mfa-enroll">
          <p className="muted">
            Scan this in your authenticator app, or enter the key manually, then
            type the 6-digit code to confirm.
          </p>
          <QrCode text={enroll.otpauth_uri} />
          <div className="mfa-secret">
            <span className="mfa-secret-label">Setup key</span>
            <code className="mfa-secret-value">{enroll.secret_base32}</code>
          </div>
          <a className="mfa-otpauth muted" href={enroll.otpauth_uri}>
            Open in authenticator app
          </a>
          <div className="field">
            <input
              className="input"
              inputMode="numeric"
              maxLength={8}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="mfa-actions">
            <button className="btn btn-primary" onClick={confirm} disabled={busy || code.length < 6}>
              {busy ? "Confirming..." : "Confirm & enable"}
            </button>
            <button className="btn btn-ghost" onClick={() => { setEnroll(null); setCode(""); }} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary" onClick={begin} disabled={busy}>
          {busy ? "Starting..." : "Set up two-factor"}
        </button>
      )}
    </section>
  );
}

// --- Active sessions ---
function SessionsSection({ toast }) {
  const [sessions, setSessions] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await api.listSessions();
      setSessions(res.sessions || []);
    } catch {
      setSessions([]);
    }
  }
  useEffect(() => { load(); }, []);

  async function revoke(id) {
    setBusy(true);
    try {
      await api.revokeSession(id);
      await load();
      toast.success("Session revoked");
    } catch (err) {
      toast.error("Couldn't revoke", err instanceof ApiError ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeAll() {
    if (!window.confirm("Sign out of all sessions? You may need to sign in again.")) return;
    setBusy(true);
    try {
      await api.revokeAllSessions();
      await load();
      toast.success("All sessions revoked");
    } catch (err) {
      toast.error("Couldn't revoke", err instanceof ApiError ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="sec-block">
      <div className="sec-head">
        <Icon name="settings" size={16} />
        <div>
          <h3>Active sessions</h3>
          <p className="muted">Devices currently signed in to your account.</p>
        </div>
      </div>

      {sessions === null ? (
        <p className="muted">Loading...</p>
      ) : sessions.length === 0 ? (
        <p className="muted">No active sessions.</p>
      ) : (
        <ul className="session-list">
          {sessions.map((s) => (
            <li key={s.id} className="session-row">
              <div className="session-info">
                <span className="session-device">{deviceLabel(s.user_agent)}</span>
                <span className="session-meta muted">
                  {s.last_used_at ? `Last active ${relTime(s.last_used_at)}` : "Recently"}
                </span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => revoke(s.id)} disabled={busy}>
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}

      {sessions && sessions.length > 0 && (
        <button className="btn btn-danger-outline" onClick={revokeAll} disabled={busy}>
          Sign out of all sessions
        </button>
      )}
    </section>
  );
}

// --- GDPR data controls ---
function DataSection({ toast, logout }) {
  const [busy, setBusy] = useState(false);

  async function exportData() {
    setBusy(true);
    try {
      const data = await api.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rsmc-my-data.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export ready", "Your data has downloaded as JSON.");
    } catch (err) {
      toast.error("Export failed", err instanceof ApiError ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (!window.confirm(
      "Delete your account? This cannot be undone. Depending on this instance's policy, your messages may be removed or anonymized."
    )) return;
    const typed = window.prompt("Type DELETE to confirm.");
    if (typed !== "DELETE") return;
    setBusy(true);
    try {
      await api.deleteMyAccount();
      toast.success("Account deleted");
      await logout();
    } catch (err) {
      toast.error("Couldn't delete", err instanceof ApiError ? err.message : "Try again.");
      setBusy(false);
    }
  }

  return (
    <section className="sec-block">
      <div className="sec-head">
        <Icon name="shield" size={16} />
        <div>
          <h3>Your data</h3>
          <p className="muted">Export a copy of your data, or delete your account.</p>
        </div>
      </div>
      <div className="mfa-actions">
        <button className="btn btn-secondary" onClick={exportData} disabled={busy}>
          Export my data
        </button>
        <button className="btn btn-danger-outline" onClick={deleteAccount} disabled={busy}>
          Delete my account
        </button>
      </div>
    </section>
  );
}

// Render an otpauth URI as a scannable QR code (SVG, no network, no canvas).
function QrCode({ text }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    try {
      const qr = qrcode(0, "M"); // type 0 = auto-size, M = ~15% error correction
      qr.addData(text);
      qr.make();
      // createSvgTag gives crisp, scalable output; cellSize/margin tuned for scan.
      setSvg(qr.createSvgTag({ cellSize: 4, margin: 8 }));
    } catch {
      setSvg("");
    }
  }, [text]);

  if (!svg) return null;
  return (
    <div
      className="mfa-qr"
      // qrcode-generator returns trusted, self-generated SVG markup.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// Coarse, human label from a user-agent string (no parsing library).
function deviceLabel(ua) {
  if (!ua) return "Unknown device";
  const s = ua.toLowerCase();
  const os = s.includes("windows") ? "Windows"
    : s.includes("mac") ? "macOS"
    : s.includes("android") ? "Android"
    : s.includes("iphone") || s.includes("ipad") ? "iOS"
    : s.includes("linux") ? "Linux" : "Unknown OS";
  const br = s.includes("edg/") ? "Edge"
    : s.includes("chrome") ? "Chrome"
    : s.includes("firefox") ? "Firefox"
    : s.includes("safari") ? "Safari" : "Browser";
  return `${br} on ${os}`;
}

function relTime(iso) {
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
