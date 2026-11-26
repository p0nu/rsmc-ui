import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { ApiError } from "../api/client.js";
import { api } from "../api/endpoints.js";
import { slugifyChannel } from "../lib/format.js";
import Logo from "../components/common/Logo.jsx";

export default function AuthView() {
  const { login, completeMfa, signup } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", username: "", display_name: "", password: "" });
  // MFA challenge: set when login returns a second-factor challenge.
  const [mfaToken, setMfaToken] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  async function verifyMfa(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await completeMfa(mfaToken, mfaCode.trim());
      // On success the auth context sets the user and the app advances.
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Invalid or expired code.";
      toast.error("Verification failed", msg);
      setBusy(false);
    }
  }

  function cancelMfa() {
    setMfaToken(null);
    setMfaCode("");
    setBusy(false);
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const res = await login(form.email.trim(), form.password);
        if (res && res.mfaRequired) {
          // Move to the code-entry step instead of completing login.
          setMfaToken(res.mfaToken);
          setBusy(false);
          return;
        }
      } else if (mode === "forgot") {
        await api.requestPasswordReset(form.email.trim());
        // Always report success regardless, to avoid revealing which emails exist.
        toast.success("Check your email", "If that address has an account, a reset link is on its way.");
        setMode("login");
      } else {
        await signup({
          email: form.email.trim(),
          username: form.username.trim(),
          // engine requires a non-empty display name; fall back to username
          display_name: form.display_name.trim() || form.username.trim(),
          password: form.password,
        });
        toast.success("Welcome to RSMC", "Your account is ready.");
      }
    } catch (err) {
      let msg = err instanceof ApiError ? err.message : "Something went wrong. Try again.";
      // A failed login returns one generic 401 whether the email is unknown or
      // the password is wrong (deliberate, to avoid revealing which accounts
      // exist). Show a clear, equally generic message instead of the engine's
      // internal "authentication required" phrasing.
      if (mode === "login" && err instanceof ApiError && err.status === 401) {
        msg = "Invalid email or password.";
      }
      toast.error(
        mode === "login" ? "Couldn't sign in" :
        mode === "forgot" ? "Couldn't send reset link" :
        "Couldn't create account",
        msg
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-panel">
        <div className="auth-column">
          <div className="auth-brand">
            <Logo size={36} />
            <span className="auth-brand-name">RSMC</span>
          </div>

          <div className="auth-card">
          {mfaToken ? (
            <>
              <h1 className="auth-title">Two-factor authentication</h1>
              <p className="auth-lede muted">
                Enter the 6-digit code from your authenticator app.
              </p>
              <form onSubmit={verifyMfa} className="auth-form">
                <div className="field">
                  <label className="field-label" htmlFor="mfa-code">Authentication code</label>
                  <input
                    id="mfa-code"
                    className="input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                    maxLength={8}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                  />
                </div>
                <button className="btn btn-primary btn-lg btn-block" disabled={busy} type="submit">
                  {busy ? "Verifying..." : "Verify"}
                </button>
                <button type="button" className="auth-link-inline" onClick={cancelMfa}>
                  Back to sign in
                </button>
              </form>
            </>
          ) : (
          <>
          <h1 className="auth-title">{
            mode === "login" ? "Sign in to RSMC" :
            mode === "forgot" ? "Reset your password" :
            "Create your account"
          }</h1>
          <p className="auth-lede muted">
            {mode === "login"
              ? "Welcome back. Pick up where your team left off."
              : mode === "forgot"
              ? "Enter your email and we'll send you a reset link."
              : "Channels, threads, and direct messages for your team."}
          </p>

          <form onSubmit={submit} className="auth-form">
            <div className="field">
              <label className="field-label" htmlFor="email">Email</label>
              <input
                id="email" className="input" type="email" autoComplete="email" required
                value={form.email} onChange={set("email")} placeholder="you@company.com"
              />
            </div>

            {mode === "signup" && (
              <>
                <div className="field">
                  <label className="field-label" htmlFor="username">Username</label>
                  <input
                    id="username" className="input" required minLength={3} maxLength={32}
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: slugifyChannel(e.target.value) }))}
                    placeholder="janedoe"
                  />
                  <span className="field-hint">3-32 characters. Letters, numbers, dot, dash, underscore.</span>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="display">Display name</label>
                  <input
                    id="display" className="input" maxLength={64}
                    value={form.display_name} onChange={set("display_name")} placeholder="Jane Doe"
                  />
                </div>
              </>
            )}

            {mode !== "forgot" && (
              <div className="field">
                <label className="field-label" htmlFor="password">Password</label>
                <input
                  id="password" className="input" type="password" required minLength={8} maxLength={128}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={form.password} onChange={set("password")} placeholder="••••••••"
                />
                {mode === "signup" && <span className="field-hint">At least 8 characters.</span>}
                {mode === "login" && (
                  <button type="button" className="auth-link-inline" onClick={() => setMode("forgot")}>
                    Forgot password?
                  </button>
                )}
              </div>
            )}

            <button className="btn btn-primary btn-lg btn-block" disabled={busy} type="submit">
              {busy ? <span className="spinner on-brand" /> : (
                mode === "login" ? "Sign in" :
                mode === "forgot" ? "Send reset link" :
                "Create account"
              )}
            </button>
          </form>

          <div className="auth-switch">
            {mode === "login" ? (
              <>New to RSMC? <button onClick={() => setMode("signup")}>Create an account</button></>
            ) : mode === "forgot" ? (
              <>Remembered it? <button onClick={() => setMode("login")}>Back to sign in</button></>
            ) : (
              <>Already have an account? <button onClick={() => setMode("login")}>Sign in</button></>
            )}
          </div>

          {mode === "signup" && (
            <p className="auth-note">
              The first account on a new workspace becomes the workspace admin.
            </p>
          )}
          </>
          )}
          </div>
        </div>
      </div>

      <aside className="auth-aside">
        <div className="auth-aside-inner">
          <h2 className="auth-aside-title">Where your team gets things done.</h2>
          <p className="auth-aside-sub">
            Organized channels, focused threads, and direct messages - in real time.
          </p>
          <div className="auth-preview">
            <PreviewRow name="Aisha" color="#6366f1" text="Shipped the v2 API 🎉" />
            <PreviewRow name="Marco" color="#10b981" text="Reviewing the migration now" />
            <PreviewRow name="Priya" color="#ec4899" text="Standup notes in #general" thread="3 replies" />
          </div>
        </div>
      </aside>
    </div>
  );
}

function PreviewRow({ name, color, text, thread }) {
  return (
    <div className="preview-row">
      <span className="preview-avatar" style={{ background: color }}>{name[0]}</span>
      <div>
        <div className="preview-name">{name}</div>
        <div className="preview-text">{text}</div>
        {thread && <div className="preview-thread">{thread}</div>}
      </div>
    </div>
  );
}
