import { useCallback, useEffect, useRef } from "react";
import { api } from "../api/endpoints.js";

// Per-channel draft persistence: restores a saved draft when the channel
// changes and debounces saves as the user types. `onRestore(content)` is called
// once with the restored text (or "") after loading. Returns { save, clear }.
//
// Threads (parentId set) don't persist drafts — only the main channel composer.
export function useDraft(channelId, { enabled = true, onRestore } = {}) {
  const timer = useRef(null);
  const lastSaved = useRef("");
  const restoreRef = useRef(onRestore);
  restoreRef.current = onRestore;

  // Restore on channel change.
  useEffect(() => {
    if (!enabled || !channelId) return;
    let live = true;
    api
      .getDraft(channelId)
      .then((d) => {
        if (!live) return;
        const content = d?.content || "";
        lastSaved.current = content;
        restoreRef.current?.(content);
      })
      .catch(() => {
        if (live) restoreRef.current?.("");
      });
    return () => {
      live = false;
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [channelId, enabled]);

  // Debounced save. A blank value deletes the draft server-side.
  const save = useCallback(
    (content) => {
      if (!enabled || !channelId) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const trimmed = (content ?? "").trim();
        // Skip a redundant save if nothing changed since the last persisted value.
        if (trimmed === lastSaved.current.trim()) return;
        lastSaved.current = content ?? "";
        api.saveDraft(channelId, content ?? "").catch(() => {});
      }, 600);
    },
    [channelId, enabled]
  );

  // Immediate clear (on send/schedule) — cancels any pending debounce.
  const clear = useCallback(() => {
    if (!enabled || !channelId) return;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (lastSaved.current.trim() === "") return; // nothing to clear
    lastSaved.current = "";
    api.saveDraft(channelId, "").catch(() => {});
  }, [channelId, enabled]);

  return { save, clear };
}
