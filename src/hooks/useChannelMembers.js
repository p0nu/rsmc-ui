import { useState, useEffect, useCallback } from "react";
import { api } from "../api/endpoints.js";
import { useAuth } from "../context/AuthContext.jsx";

// Loads a channel's members and derives the current user's channel role.
// Note: the engine's /members returns UserPublic (no per-member role), so we
// infer "owner" from channel.created_by; finer-grained channel-admin state is
// surfaced where the engine reports it. The caller can administer if they are
// the creator (owner) OR a system admin.
export function useChannelMembers(channel) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!channel) return;
    setLoading(true);
    try {
      const list = await api.listMembers(channel.id);
      setMembers(list);
    } finally {
      setLoading(false);
    }
  }, [channel?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const isCreator = channel?.created_by === user.id;
  // The creator is always a member; otherwise check the loaded roster. This
  // also means a transient failure to load members can't wrongly present the
  // creator with a "join this channel" prompt.
  const isMember = isCreator || members.some((m) => m.id === user.id);
  // owner (creator) or system admin can administer the channel
  const canAdminister = isCreator || user.role === "admin";
  const myChannelRole = isCreator ? "owner" : "member";

  return { members, loading, reload: load, isMember, canAdminister, myChannelRole };
}
