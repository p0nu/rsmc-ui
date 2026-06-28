import { useCallback, useEffect, useState } from "react";
import { api } from "../api/endpoints.js";

// Loads the workspace app links (bookmarks). Returns the list plus a reload fn
// so the admin panel can refresh the rail after changes.
export function useAppLinks() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const list = await api.listAppLinks();
      setLinks(Array.isArray(list) ? list : []);
    } catch {
      // Non-fatal: an empty Apps panel is an acceptable degraded state.
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { links, loading, reload };
}
