import { useState, useEffect, useCallback } from "react";
import { api } from "../api/endpoints.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useRealtime } from "./useRealtime.js";

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
      const res = await api.listMembers(channel.id, { limit: 200 });
      // Response is { members, next_cursor }. For very large channels this
      // shows the first page; the roster patches live via realtime events.
      setMembers(Array.isArray(res) ? res : res.members || []);
    } finally {
      setLoading(false);
    }
  }, [channel?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Patch the roster live from realtime events so it stays current without a
  // refetch: additions, removals, and profile changes.
  useRealtime("member_joined", (f) => {
    if (!channel || f.channel_id !== channel.id) return;
    setMembers((ms) => (ms.some((m) => m.id === f.user.id) ? ms : [...ms, f.user]));
  });
  useRealtime("member_left", (f) => {
    if (!channel || f.channel_id !== channel.id) return;
    setMembers((ms) => ms.filter((m) => m.id !== f.user_id));
  });
  useRealtime("profile_updated", (f) => {
    setMembers((ms) =>
      ms.map((m) =>
        m.id === f.user_id
          ? { ...m, display_name: f.display_name, avatar_url: f.avatar_url }
          : m
      )
    );
  });
  useRealtime("status_changed", (f) => {
    setMembers((ms) =>
      ms.map((m) =>
        m.id === f.user_id ? { ...m, status_emoji: f.emoji, status_text: f.text } : m
      )
    );
  });

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
