import { useEffect, useState } from "react";

// Tracks whether the browser tab is currently visible. Used to decide when to
// surface unread activity for the channel the user is "in": while the tab is
// hidden, the active channel should still count toward unread badges and the
// tab title, because the user isn't actually reading it.
export function useVisibility() {
  const [visible, setVisible] = useState(
    typeof document === "undefined" ? true : document.visibilityState === "visible"
  );
  useEffect(() => {
    function onChange() {
      setVisible(document.visibilityState === "visible");
    }
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}
