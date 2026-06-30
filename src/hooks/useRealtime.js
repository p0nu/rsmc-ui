import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export function useConnectionStatus() {
  const { rt } = useAuth();
  const [s, setS] = useState(rt.status);
  useEffect(() => rt.onStatus(setS), [rt]);
  return s;
}

export function useRealtime(type, handler) {
  const { rt } = useAuth();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => rt.on(type, (f) => ref.current?.(f)), [rt, type]);
}

export function useSubscription(channelId) {
  const { rt } = useAuth();
  useEffect(() => {
    if (!channelId) return;
    rt.subscribe(channelId);
    // No unsubscribe on unmount: Workspace subscribes to all of the user's
    // channels so background unread badges update live. Unsubscribing the
    // active channel here on navigation would drop those events.
  }, [rt, channelId]);
}
