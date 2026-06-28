import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";

// Theme preference: "light" | "dark" | "system".
// Persisted to localStorage; "system" follows the OS setting live.
const STORAGE_KEY = "rsmc.theme";
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

  const value = useMemo(
    () => ({ preference, resolved, setTheme }),
    [preference, resolved, setTheme]
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
