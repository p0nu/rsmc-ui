// ---------------------------------------------------------------------------
// Device-local notification presentation: a short sound and (optionally) a
// desktop/system notification. Both are gated by the caller against the user's
// client-side preferences. Everything here is best-effort and never throws:
// audio may be blocked before the first user gesture, and the Notification API
// may be unavailable or denied.
// ---------------------------------------------------------------------------

let audioCtx = null;

// A short, soft two-tone chime synthesized with the Web Audio API so we don't
// need to ship or fetch an audio asset. Silently no-ops if audio is blocked.
export function playNotificationSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    // Some browsers start the context suspended until a user gesture.
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});

    const now = audioCtx.currentTime;
    const gain = audioCtx.createGain();
    gain.connect(audioCtx.destination);
    // Keep it quiet and quick.
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.setValueAtTime(880, now + 0.12);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.36);
  } catch {
    /* audio unavailable: ignore */
  }
}

// Show a desktop notification if the browser supports it and permission was
// already granted. Does not request permission here (that happens from the
// Settings toggle, which is a direct user gesture).
export function showDesktopNotification(title, body) {
  try {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    // Only surface when the tab is actually backgrounded; if the user is
    // looking at the app, the in-app toast is enough.
    if (typeof document !== "undefined" && document.visibilityState === "visible") return;
    const n = new Notification(title, { body, tag: "rsmc-notification" });
    // Focus the app when the notification is clicked.
    n.onclick = () => {
      try {
        window.focus();
        n.close();
      } catch {
        /* ignore */
      }
    };
  } catch {
    /* notifications unavailable: ignore */
  }
}
