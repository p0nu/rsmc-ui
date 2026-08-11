import { useState } from "react";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { api } from "../../api/endpoints.js";
import { loadClientPrefs, saveClientPrefs } from "../../lib/clientPrefs.js";
import { Modal } from "../common/Modal.jsx";
import Icon from "../common/Icon.jsx";

const THEME_OPTIONS = [
  { value: "light", label: "Light", hint: "Always use the light theme" },
  { value: "dark", label: "Dark", hint: "Always use the dark theme" },
  { value: "system", label: "System", hint: "Match your device setting" },
];

export default function SettingsModal({ onClose }) {
  const { preference, setTheme, contrast, setContrast, fontScale, setFontScale } = useTheme();
  const { user, setUser } = useAuth();
  const toast = useToast();

  // Server-backed notification preferences. Fall back to all-on if for some
  // reason they were not attached (older session), matching the engine default.
  const serverPrefs = user?.notification_prefs || {
    broadcast: true,
    thread_reply: true,
    dm: true,
  };
  // Which server toggle is mid-save, so we can disable just that row.
  const [saving, setSaving] = useState(null);

  // Device-local preferences (sound, desktop) live in localStorage.
  const [clientPrefs, setClientPrefs] = useState(loadClientPrefs);

  async function saveServerPref(key, value) {
    // Optimistic update so the switch responds immediately; revert on failure.
    const prev = serverPrefs[key];
    setUser((u) => ({
      ...u,
      notification_prefs: { ...(u?.notification_prefs || serverPrefs), [key]: value },
    }));
    setSaving(key);
    try {
      const updated = await api.updateNotificationPrefs({ [key]: value });
      // Trust the server's echo of the full prefs object.
      setUser((u) => ({ ...u, notification_prefs: updated.notification_prefs }));
    } catch {
      setUser((u) => ({
        ...u,
        notification_prefs: { ...(u?.notification_prefs || serverPrefs), [key]: prev },
      }));
      toast.error("Could not save preference", "Please try again.");
    } finally {
      setSaving(null);
    }
  }

  function saveClientPref(key, value) {
    const next = { ...clientPrefs, [key]: value };
    setClientPrefs(next);
    saveClientPrefs(next);
  }

  // Requesting desktop-notification permission is only meaningful when turning
  // the toggle ON, and only when the browser supports it.
  async function toggleDesktop(value) {
    if (value && typeof Notification !== "undefined") {
      if (Notification.permission === "default") {
        try {
          const perm = await Notification.requestPermission();
          if (perm !== "granted") {
            toast.error("Desktop notifications blocked", "Your browser did not grant permission.");
            saveClientPref("desktop", false);
            return;
          }
        } catch {
          /* ignore: fall through and store the preference anyway */
        }
      } else if (Notification.permission === "denied") {
        toast.error("Desktop notifications blocked", "Enable them in your browser settings first.");
        saveClientPref("desktop", false);
        return;
      }
    }
    saveClientPref("desktop", value);
  }

  return (
    <Modal title="Settings" subtitle="Personalize how RSMC looks and behaves." onClose={onClose} width={560}>
      <div className="settings">
        <Section
          icon="settings"
          title="Appearance"
          desc="Choose a color theme for this device. Your choice is remembered."
        >
          <div className="settings-themes">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`settings-theme ${preference === opt.value ? "active" : ""}`}
                onClick={() => setTheme(opt.value)}
                aria-pressed={preference === opt.value}
              >
                <span className={`theme-swatch theme-swatch-${opt.value}`} aria-hidden="true" />
                <span className="settings-theme-label">{opt.label}</span>
                <span className="settings-theme-hint">{opt.hint}</span>
                {preference === opt.value && (
                  <span className="settings-theme-check">
                    <Icon name="check" size={14} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </Section>

        <Section
          icon="shield"
          title="Accessibility"
          desc="Options to improve readability and legibility. These apply on this device."
        >
          <div className="settings-toggles">
            <Toggle
              icon="settings"
              label="High contrast"
              hint="Stronger text, borders and focus outlines. Works with light or dark."
              on={contrast === "high"}
              onChange={(v) => setContrast(v ? "high" : "normal")}
            />
          </div>

          <div className="settings-fontscale">
            <span className="settings-fontscale-label">Text size</span>
            <div className="settings-segmented" role="group" aria-label="Text size">
              {[
                { value: "small", label: "Small" },
                { value: "default", label: "Default" },
                { value: "large", label: "Large" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`settings-segment ${fontScale === opt.value ? "active" : ""}`}
                  onClick={() => setFontScale(opt.value)}
                  aria-pressed={fontScale === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section
          icon="bell"
          title="Notifications"
          desc="Choose which notifications you receive. Direct @mentions of you are always delivered."
        >
          <div className="settings-toggles">
            <Toggle
              icon="at"
              label="Broadcast mentions"
              hint="@channel, @here and @everyone announcements."
              on={serverPrefs.broadcast}
              busy={saving === "broadcast"}
              onChange={(v) => saveServerPref("broadcast", v)}
            />
            <Toggle
              icon="thread"
              label="Thread replies"
              hint="Replies to threads you started."
              on={serverPrefs.thread_reply}
              busy={saving === "thread_reply"}
              onChange={(v) => saveServerPref("thread_reply", v)}
            />
            <Toggle
              icon="send"
              label="Direct messages"
              hint="Messages sent to you directly."
              on={serverPrefs.dm}
              busy={saving === "dm"}
              onChange={(v) => saveServerPref("dm", v)}
            />
          </div>

          <p className="muted settings-subgroup-note">
            These apply on this device only.
          </p>
          <div className="settings-toggles">
            <Toggle
              icon="bell"
              label="Notification sound"
              hint="Play a sound when a notification arrives."
              on={clientPrefs.sound}
              onChange={(v) => saveClientPref("sound", v)}
            />
            <Toggle
              icon="bell"
              label="Desktop notifications"
              hint="Show a system notification when RSMC is in the background."
              on={clientPrefs.desktop}
              onChange={toggleDesktop}
            />
          </div>
        </Section>
      </div>
    </Modal>
  );
}

function Toggle({ icon, label, hint, on, busy, onChange }) {
  return (
    <button
      type="button"
      className={`switch-row ${on ? "on" : ""}`}
      onClick={() => !busy && onChange(!on)}
      aria-pressed={on}
      disabled={busy}
    >
      <span className="switch">
        <span className="switch-knob" />
      </span>
      <span className="switch-text">
        <span className="switch-label">
          {icon && <Icon name={icon} size={14} />} {label}
        </span>
        <span className="switch-hint">{hint}</span>
      </span>
    </button>
  );
}

function Section({ icon, title, desc, children }) {
  return (
    <section className="settings-section">
      <div className="settings-section-head">
        <span className="settings-section-icon">
          <Icon name={icon} size={18} />
        </span>
        <div>
          <h3 className="settings-section-title">{title}</h3>
          {desc && <p className="muted settings-section-desc">{desc}</p>}
        </div>
      </div>
      <div className="settings-section-body">{children}</div>
    </section>
  );
}
