import { createContext, useContext, useCallback, useMemo, useState } from "react";

const Ctx = createContext(null);
export const useToast = () => useContext(Ctx);

let seq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (opts) => {
      const id = ++seq;
      const t = { id, variant: "default", ttl: 4500, ...opts };
      setToasts((ts) => {
        // Safety net: collapse a burst of identical toasts (same title+message)
        // into one so a misbehaving caller can never flood the screen. Cap the
        // total number of visible toasts as a second guard.
        const dupe = ts.find((x) => x.title === t.title && x.msg === t.msg);
        if (dupe) return ts;
        const next = [...ts, t];
        return next.length > 4 ? next.slice(next.length - 4) : next;
      });
      if (t.ttl) setTimeout(() => dismiss(id), t.ttl);
      return id;
    },
    [dismiss]
  );

  // The context value MUST be stable across renders. If it were recreated each
  // render, every consumer that depends on a toast helper (e.g. a useCallback
  // with `toast` in its deps) would get a new identity on each render, which
  // can cascade into effect re-runs and, on a failing request, an infinite
  // error-toast loop. useMemo + useCallback-backed `push` keeps it stable.
  const value = useMemo(
    () => ({
      push,
      dismiss,
      info: (title, msg) => push({ title, msg }),
      success: (title, msg) => push({ title, msg, variant: "success" }),
      error: (title, msg) => push({ title, msg, variant: "error", ttl: 6500 }),
    }),
    [push, dismiss]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.variant}`} onClick={() => dismiss(t.id)}>
            <span className="toast-accent" />
            <div className="toast-body">
              {t.title && <div className="toast-title">{t.title}</div>}
              {t.msg && <div className="toast-msg">{t.msg}</div>}
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
