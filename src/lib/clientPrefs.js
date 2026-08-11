// ---------------------------------------------------------------------------
// Device-local preferences that only the browser can act on, so they live in
// localStorage rather than on the server (a sound can only play on the device
// that is currently open). Kept deliberately small and defensive: any storage
// error falls back to sensible defaults rather than throwing.
// ---------------------------------------------------------------------------

const KEY = "rsmc.clientPrefs";

const DEFAULTS = {
  // Play a short sound when a notification arrives.
  sound: true,
  // Show a browser/desktop notification when the tab is not focused.
  desktop: false,
};

export function loadClientPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && typeof raw === "object") {
      return { ...DEFAULTS, ...raw };
    }
  } catch {
    /* ignore malformed storage */
  }
  return { ...DEFAULTS };
}

export function saveClientPrefs(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* storage full or unavailable: preference simply is not persisted */
  }
}
