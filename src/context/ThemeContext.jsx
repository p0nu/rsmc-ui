import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";

// Theme preference: "light" | "dark" | "system".
// Persisted to localStorage; "system" follows the OS setting live.
//
// Contrast is an orthogonal axis: "normal" | "high". High contrast layers on
// top of whichever light/dark theme is active (via data-contrast on the root),
// so a user can have high-contrast light or high-contrast dark.
const STORAGE_KEY = "rsmc.theme";
const CONTRAST_KEY = "rsmc.contrast";
const FONT_SCALE_KEY = "rsmc.fontScale";
const ThemeContext = createContext(null);

function systemPrefersDark() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(pref) {
  if (pref === "system") return systemPrefersDark() ? "dark" : "light";
  return pref;
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "system";
    } catch {
      return "system";
    }
  });

  const [contrast, setContrast] = useState(() => {
    try {
      return localStorage.getItem(CONTRAST_KEY) || "normal";
    } catch {
      return "normal";
    }
  });

  const [fontScale, setFontScale] = useState(() => {
    try {
      return localStorage.getItem(FONT_SCALE_KEY) || "default";
    } catch {
      return "default";
    }
  });

  const [resolved, setResolved] = useState(() => resolve(preference));

  // Apply the resolved theme to the document root.
  useEffect(() => {
    const r = resolve(preference);
    setResolved(r);
    document.documentElement.setAttribute("data-theme", r);
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      /* ignore */
    }
  }, [preference]);

  // Apply the contrast axis independently of light/dark.
  useEffect(() => {
    if (contrast === "high") {
      document.documentElement.setAttribute("data-contrast", "high");
    } else {
      document.documentElement.removeAttribute("data-contrast");
    }
    try {
      localStorage.setItem(CONTRAST_KEY, contrast);
    } catch {
      /* ignore */
    }
  }, [contrast]);

  // Apply the font-scale axis (text scaling) independently of theme/contrast.
  useEffect(() => {
    if (fontScale === "small" || fontScale === "large") {
      document.documentElement.setAttribute("data-font-scale", fontScale);
    } else {
      document.documentElement.removeAttribute("data-font-scale");
    }
    try {
      localStorage.setItem(FONT_SCALE_KEY, fontScale);
    } catch {
      /* ignore */
    }
  }, [fontScale]);

  // When following the system, react to OS changes live.
  useEffect(() => {
    if (preference !== "system" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const r = systemPrefersDark() ? "dark" : "light";
      setResolved(r);
      document.documentElement.setAttribute("data-theme", r);
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [preference]);

  const setTheme = useCallback((pref) => setPreference(pref), []);
  const setContrast_ = useCallback((c) => setContrast(c), []);
  const setFontScale_ = useCallback((s) => setFontScale(s), []);

  const value = useMemo(
    () => ({
      preference,
      resolved,
      setTheme,
      contrast,
      setContrast: setContrast_,
      fontScale,
      setFontScale: setFontScale_,
    }),
    [preference, resolved, setTheme, contrast, setContrast_, fontScale, setFontScale_]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
