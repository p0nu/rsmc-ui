import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { ApiError } from "../api/client.js";
import { slugifyChannel } from "../lib/format.js";
import Logo from "../components/common/Logo.jsx";

export default function AuthView() {
  const { login, signup } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", username: "", display_name: "", password: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        await login(form.email.trim(), form.password);
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
      const msg = err instanceof ApiError ? err.message : "Something went wrong. Try again.";
      toast.error(mode === "login" ? "Couldn't sign in" : "Couldn't create account", msg);
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
          <h1 className="auth-title">{mode === "login" ? "Sign in to RSMC" : "Create your account"}</h1>
          <p className="auth-lede muted">
            {mode === "login"
              ? "Welcome back. Pick up where your team left off."
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
                  <span className="field-hint">3–32 characters. Letters, numbers, dot, dash, underscore.</span>
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

            <div className="field">
              <label className="field-label" htmlFor="password">Password</label>
              <input
                id="password" className="input" type="password" required minLength={8} maxLength={128}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={form.password} onChange={set("password")} placeholder="••••••••"
              />
              {mode === "signup" && <span className="field-hint">At least 8 characters.</span>}
            </div>

            <button className="btn btn-primary btn-lg btn-block" disabled={busy} type="submit">
              {busy ? <span className="spinner on-brand" /> : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="auth-switch">
            {mode === "login" ? (
              <>New to RSMC? <button onClick={() => setMode("signup")}>Create an account</button></>
            ) : (
              <>Already have an account? <button onClick={() => setMode("login")}>Sign in</button></>
            )}
          </div>

          {mode === "signup" && (
            <p className="auth-note">
              The first account on a new workspace becomes the workspace admin.
            </p>
          )}
          </div>
        </div>
      </div>

      <aside className="auth-aside">
        <div className="auth-aside-inner">
          <h2 className="auth-aside-title">Where your team gets things done.</h2>
          <p className="auth-aside-sub">
            Organized channels, focused threads, and direct messages — in real time.
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
