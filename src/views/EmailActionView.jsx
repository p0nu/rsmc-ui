import { useEffect, useState } from "react";
import { api } from "../api/endpoints.js";
import { ApiError } from "../api/client.js";
import Logo from "../components/common/Logo.jsx";

// Handles the token-carrying links the engine emails:
//   /verify-email?token=...
//   /reset-password?token=...
//   /confirm-email-change?token=...
// Rendered before auth so logged-out users can complete these flows. On
// success it clears the URL so a refresh returns to the normal app.

export function detectEmailAction() {
  const path = window.location.pathname;
  const token = new URLSearchParams(window.location.search).get("token");
  if (!token) return null;
  if (path.endsWith("/verify-email")) return { kind: "verify", token };
  if (path.endsWith("/reset-password")) return { kind: "reset", token };
  if (path.endsWith("/confirm-email-change")) return { kind: "change", token };
  return null;
}

export default function EmailActionView({ action }) {
  const { kind, token } = action;

  // Verify + change confirm run immediately; reset shows a password form.
  const [status, setStatus] = useState(kind === "reset" ? "form" : "working");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (kind === "verify") {
        try {
          await api.verifyEmail(token);
          if (!cancelled) { setStatus("ok"); setMessage("Your email is verified. You can sign in now."); }
        } catch (err) {
          if (!cancelled) { setStatus("error"); setMessage(errMsg(err)); }
        }
      } else if (kind === "change") {
        try {
          await api.confirmEmailChange(token);
          if (!cancelled) { setStatus("ok"); setMessage("Your email address has been updated."); }
        } catch (err) {
          if (!cancelled) { setStatus("error"); setMessage(errMsg(err)); }
        }
      }
    }
    run();
    return () => { cancelled = true; };
  }, [kind, token]);

  async function submitReset(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.confirmPasswordReset(token, password);
      setStatus("ok");
      setMessage("Your password has been reset. You can sign in with your new password.");
    } catch (err) {
      setStatus("error");
      setMessage(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  const title =
    kind === "verify" ? "Verifying your email" :
    kind === "change" ? "Confirming your new email" :
    "Reset your password";

  return (
    <div className="auth">
      <div className="auth-panel">
        <div className="auth-column">
          <div className="auth-brand">
            <Logo size={36} />
            <span className="auth-brand-name">RSMC</span>
          </div>
          <div className="auth-card">
            <h1 className="auth-title">{title}</h1>

            {status === "working" && (
              <p className="auth-lede muted"><span className="spinner" /> Working...</p>
            )}

            {status === "form" && (
              <form onSubmit={submitReset} className="auth-form">
                <p className="auth-lede muted">Choose a new password for your account.</p>
                <div className="field">
                  <label className="field-label" htmlFor="new-password">New password</label>
                  <input
                    id="new-password" className="input" type="password" required
                    minLength={8} maxLength={128} autoComplete="new-password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <span className="field-hint">At least 8 characters.</span>
                </div>
                <button className="btn btn-primary btn-lg btn-block" disabled={busy} type="submit">
                  {busy ? <span className="spinner on-brand" /> : "Set new password"}
                </button>
              </form>
            )}

            {status === "ok" && (
              <>
                <p className="auth-lede">{message}</p>
                <button className="btn btn-primary btn-lg btn-block" onClick={() => { window.location.href = "/"; }}>
                  Continue to sign in
                </button>
              </>
            )}

            {status === "error" && (
              <>
                <p className="auth-lede muted">{message}</p>
                <button className="btn btn-secondary btn-lg btn-block" onClick={() => { window.location.href = "/"; }}>
                  Back to sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function errMsg(err) {
  return err instanceof ApiError ? err.message : "This link is invalid or has expired.";
}
