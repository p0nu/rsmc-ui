import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "../../api/endpoints.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useRealtime, useSubscription } from "../../hooks/useRealtime.js";
import { useChannelMembers } from "../../hooks/useChannelMembers.js";
import { displayName } from "../../lib/format.js";
import { canCreateChannel } from "../../lib/permissions.js";

import MessageList from "./MessageList.jsx";
import Composer from "./Composer.jsx";
import ThreadPanel from "./ThreadPanel.jsx";
import MembersPanel from "./MembersPanel.jsx";
import FilesPanel from "./FilesPanel.jsx";
import PinsPanel from "./PinsPanel.jsx";
import ChannelHeader from "./ChannelHeader.jsx";
import ChannelSettingsModal from "../modals/ChannelSettingsModal.jsx";
import SearchModal from "../modals/SearchModal.jsx";
import { Loading } from "../common/Modal.jsx";
import Icon from "../common/Icon.jsx";

const TYPING_TTL = 4000;

// Immutably apply a reaction add/remove event to a message's reactions array.
function applyReaction(msg, f, added) {
  const reactions = (msg.reactions || []).map((g) => ({ ...g, user_ids: [...g.user_ids] }));
  const idx = reactions.findIndex((g) => g.emoji === f.emoji);
  if (added) {
    if (idx === -1) reactions.push({ emoji: f.emoji, count: 1, user_ids: [f.user_id] });
    else if (!reactions[idx].user_ids.includes(f.user_id)) {
      reactions[idx].count += 1;
      reactions[idx].user_ids.push(f.user_id);
    }
  } else if (idx !== -1) {
    reactions[idx].user_ids = reactions[idx].user_ids.filter((u) => u !== f.user_id);
    reactions[idx].count = reactions[idx].user_ids.length;
    if (reactions[idx].count === 0) reactions.splice(idx, 1);
  }
  return { ...msg, reactions };
}

export default function ChannelScreen({ channel, presence, onChannelChanged, onLeft, onToggleSidebar }) {
  const { user } = useAuth();
  const toast = useToast();
  const members = useChannelMembers(channel);

  const [messages, setMessages] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typing, setTyping] = useState({});
  const [receipts, setReceipts] = useState({}); // user_id -> last_read_at (ms epoch)
  const [panel, setPanel] = useState(null); // 'members' | 'files' | null
  const [thread, setThread] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const atBottom = useRef(true);
  const markReadTimer = useRef(null);
  // Reply message ids we've already folded into a parent's reply_count, so a
  // re-delivered event, a reconnect replay, or StrictMode's double-invoked
  // effects can never inflate the count (the cause of "1 reply" showing as "4").
  const countedReplyIds = useRef(new Set());
  // Snapshot of the channel's last_read_at at open time, for the "new messages"
  // divider (server advances the real cursor once we load history).
  const openReadAt = useRef(channel.last_read_at ?? null);

  // Debounced "advance my read cursor on the server" for the active channel.
  // Coalesces bursts of incoming messages into a single request.
  const markReadSoon = useCallback(() => {
    if (markReadTimer.current) clearTimeout(markReadTimer.current);
    markReadTimer.current = setTimeout(() => {
      api.markChannelRead(channel.id).catch(() => {});
    }, 400);
  }, [channel.id]);

  // Cancel any pending mark-read when switching channels/unmounting.
  useEffect(() => {
    return () => {
      if (markReadTimer.current) clearTimeout(markReadTimer.current);
    };
  }, [channel.id]);

  useSubscription(channel.id);

  const isDirect = channel.channel_type === "direct";
  const canModerate = members.canAdminister;

  // ---- initial history ----
  useEffect(() => {
    let live = true;
    setLoading(true);
    setMessages([]);
    setCursor(null);
    setThread(null);
    setPanel(null);
    openReadAt.current = channel.last_read_at ?? null;
    // History returns the server-authoritative reply_count for every message, so
    // forget any locally-counted replies from the previous channel view.
    countedReplyIds.current.clear();
    // Load who has read up to where, for the "Seen" / "Seen by N" indicators.
    setReceipts({});
    api
      .channelReceipts(channel.id)
      .then((rows) => {
        if (!live) return;
        const next = {};
        for (const r of rows) next[r.user_id] = new Date(r.last_read_at).getTime();
        setReceipts(next);
      })
      .catch(() => {});
    api
      .history(channel.id, { limit: 50 })
      .then((res) => {
        if (!live) return;
        setMessages(res.messages.slice().reverse());
        setCursor(res.next_cursor);
      })
      .catch((e) => toast.error("Couldn't load messages", e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [channel.id]);

  useEffect(() => {
    if (!loading) requestAnimationFrame(() => scrollToBottom("auto"));
  }, [loading]);

  function scrollToBottom(behavior = "smooth") {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  }

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    if (el.scrollTop < 120 && cursor && !loadingMore) loadOlder();
  }

  async function loadOlder() {
    if (!cursor) return;
    setLoadingMore(true);
    const el = scrollRef.current;
    const prev = el?.scrollHeight || 0;
    try {
      const res = await api.history(channel.id, { limit: 50, before: cursor });
      setMessages((m) => [...res.messages.slice().reverse(), ...m]);
      setCursor(res.next_cursor);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prev;
      });
    } finally {
      setLoadingMore(false);
    }
  }

  // ---- realtime ----
  useRealtime("message_created", (f) => {
    if (f.channel_id !== channel.id) return;
    const msg = f.message;
    if (msg.parent_id) {
      // Fold this reply into its parent's count exactly once. Without the guard,
      // StrictMode's double-registered handler, a WS reconnect, or the sender
      // also receiving its own event would each add another increment — which
      // is how a single reply rendered as "4 replies".
      if (msg.id && countedReplyIds.current.has(msg.id)) return;
      if (msg.id) countedReplyIds.current.add(msg.id);
      setMessages((m) =>
        m.map((x) => (x.id === msg.parent_id ? { ...x, reply_count: (x.reply_count || 0) + 1 } : x))
      );
      return;
    }
    setMessages((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]));
    if (atBottom.current || msg.author?.id === user.id) {
      requestAnimationFrame(() => scrollToBottom());
    }
    // We're looking at this channel, so anything that lands here is already
    // read. Advance the server read cursor (debounced) so a later channel-list
    // refresh won't resurrect these as unread.
    if (msg.author?.id !== user.id) markReadSoon();
  });
  useRealtime("message_updated", (f) => {
    if (f.channel_id !== channel.id) return;
    setMessages((m) => m.map((x) => (x.id === f.message.id ? f.message : x)));
  });
  useRealtime("message_deleted", (f) => {
    if (f.channel_id !== channel.id) return;
    setMessages((m) =>
      m.map((x) => (x.id === f.message_id ? { ...x, deleted_at: new Date().toISOString(), content: "" } : x))
    );
  });
  useRealtime("reaction_added", (f) => {
    if (f.channel_id !== channel.id) return;
    setMessages((m) => m.map((x) => (x.id === f.message_id ? applyReaction(x, f, true) : x)));
  });
  useRealtime("reaction_removed", (f) => {
    if (f.channel_id !== channel.id) return;
    setMessages((m) => m.map((x) => (x.id === f.message_id ? applyReaction(x, f, false) : x)));
  });
  useRealtime("typing", (f) => {
    if (f.channel_id !== channel.id || f.user_id === user.id) return;
    setTyping((t) => ({ ...t, [f.user_id]: Date.now() + TYPING_TTL }));
  });
  useRealtime("read", (f) => {
    if (f.channel_id !== channel.id) return;
    const ts = new Date(f.last_read_at).getTime();
    setReceipts((r) => (r[f.user_id] >= ts ? r : { ...r, [f.user_id]: ts }));
  });

  useEffect(() => {
    const iv = setInterval(() => {
      setTyping((t) => {
        const now = Date.now();
        let changed = false;
        const next = {};
        for (const [k, v] of Object.entries(t)) {
          if (v > now) next[k] = v;
          else changed = true;
        }
        return changed ? next : t;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const handleSent = useCallback((msg) => {
    if (!msg.parent_id) {
      setMessages((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]));
      requestAnimationFrame(() => scrollToBottom());
    }
  }, []);
  const onEdited = useCallback((u) => setMessages((m) => m.map((x) => (x.id === u.id ? u : x))), []);
  const onDeleted = useCallback(
    (id) => setMessages((m) => m.map((x) => (x.id === id ? { ...x, deleted_at: new Date().toISOString(), content: "" } : x))),
    []
  );
  // Pin/unpin returns the updated message; replace it in place. The realtime
  // MessageUpdated event keeps other clients in sync.
  const onPinChanged = useCallback((u) => setMessages((m) => m.map((x) => (x.id === u.id ? u : x))), []);

  function togglePanel(name) {
    setPanel((p) => (p === name ? null : name));
    setThread(null);
  }
  function openThread(root) {
    setThread({ root });
    setPanel(null);
  }

  const typingUsers = Object.keys(typing)
    .map((id) => members.members.find((m) => m.id === id))
    .filter(Boolean);

  // Read receipt for my most recent (non-deleted) message: which other members
  // have read up to or past it. Shown as "Seen" (DM) or "Seen by N" (channel).
  const seen = (() => {
    const mine = [...messages].reverse().find((m) => m.user_id === user.id && !m.deleted_at);
    if (!mine) return null;
    const at = new Date(mine.created_at).getTime();
    const readers = Object.entries(receipts)
      .filter(([uid, ts]) => uid !== user.id && ts >= at)
      .map(([uid]) => members.members.find((m) => m.id === uid))
      .filter(Boolean);
    if (readers.length === 0) return null;
    return { messageId: mine.id, readers, isDirect };
  })();

  // guests cannot create channels but CAN send messages; posting requires
  // membership. While the member roster is still loading, don't prematurely
  // show the "join" state — assume posting is allowed to avoid a flash, and let
  // the real membership result settle it a moment later.
  const canPost = isDirect || members.isMember || members.loading;

  return (
    <div className="channel-screen">
      <ChannelHeader
        channel={channel}
        presence={presence}
        memberCount={members.members.length}
        canAdminister={members.canAdminister}
        activePanel={panel}
        onToggleMembers={() => togglePanel("members")}
        onToggleFiles={() => togglePanel("files")}
        onTogglePins={() => togglePanel("pins")}
        onSearch={() => setShowSearch(true)}
        onOpenSettings={() => setShowSettings(true)}
        onToggleSidebar={onToggleSidebar}
      />

      <div className="channel-content">
        <div className="channel-center">
          <div className="channel-stream" ref={scrollRef} onScroll={onScroll}>
            {loading ? (
              <div className="channel-stream-loading"><Loading /></div>
            ) : (
              <>
                {cursor ? (
                  <div className="load-older">
                    <button className="btn btn-sm" onClick={loadOlder} disabled={loadingMore}>
                      {loadingMore ? "Loading…" : "Load earlier messages"}
                    </button>
                  </div>
                ) : (
                  <ChannelIntro channel={channel} />
                )}
                <MessageList
                  messages={messages}
                  presence={presence}
                  canModerate={canModerate}
                  onOpenThread={openThread}
                  onEdited={onEdited}
                  onDeleted={onDeleted}
                  onPinChanged={onPinChanged}
                  lastReadAt={openReadAt.current}
                  currentUserId={user.id}
                />
                {seen && <SeenIndicator seen={seen} />}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          <div className="channel-foot">
            <TypingIndicator users={typingUsers} />
            <Composer
              channelId={channel.id}
              placeholder={`Message ${channel.name ? "#" + channel.name : displayName(channel.peer)}`}
              onSent={handleSent}
              disabled={!canPost}
              disabledReason="Join this channel to send messages."
            />
          </div>
        </div>

        {panel === "members" && (
          <MembersPanel
            channel={channel}
            members={members.members}
            presence={presence}
            canAdminister={members.canAdminister}
            onClose={() => setPanel(null)}
            onChanged={async () => {
              await members.reload();
              onChannelChanged?.();
            }}
          />
        )}
        {panel === "files" && (
          <FilesPanel channel={channel} onClose={() => setPanel(null)} />
        )}
        {panel === "pins" && (
          <PinsPanel
            channel={channel}
            onClose={() => setPanel(null)}
            onJump={() => setPanel(null)}
          />
        )}
        {thread && (
          <ThreadPanel
            channel={channel}
            root={thread.root}
            presence={presence}
            canModerate={canModerate}
            canPost={canPost}
            onClose={() => setThread(null)}
          />
        )}
      </div>

      {showSettings && (
        <ChannelSettingsModal
          channel={channel}
          canAdminister={members.canAdminister}
          onClose={() => setShowSettings(false)}
          onUpdated={() => {
            setShowSettings(false);
            onChannelChanged?.();
          }}
          onLeft={() => {
            setShowSettings(false);
            onLeft?.();
          }}
        />
      )}
      {showSearch && (
        <SearchModal
          channel={channel}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}

function ChannelIntro({ channel }) {
  const isDirect = channel.channel_type === "direct";
  const name = channel.name ? `#${channel.name}` : displayName(channel.peer);
  return (
    <div className="channel-intro">
      <div className="channel-intro-mark">
        <Icon name={isDirect ? "at" : channel.channel_type === "private" ? "lock" : "hash"} size={26} />
      </div>
      <h2>{isDirect ? displayName(channel.peer) : name}</h2>
      <p className="muted">
        {channel.topic
          ? channel.topic
          : isDirect
          ? `This is the start of your conversation with ${displayName(channel.peer)}.`
          : `This is the very beginning of ${name}.`}
      </p>
    </div>
  );
}

function TypingIndicator({ users }) {
  if (users.length === 0) return <div className="typing-row" aria-hidden="true" />;
  const names = users.map((u) => displayName(u));
  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing`
      : `${names.length} people are typing`;
  return (
    <div className="typing-row active">
      <span className="typing-dots"><i /><i /><i /></span>
      <span>{label}…</span>
    </div>
  );
}

// "Seen" (DM) or "Seen by N" (channel), shown under the sender's last message.
// The names are exposed via title for a hover tooltip.
function SeenIndicator({ seen }) {
  const names = seen.readers.map((u) => displayName(u));
  const label = seen.isDirect
    ? "Seen"
    : `Seen by ${names.length}`;
  return (
    <div className="seen-row" title={names.join(", ")}>
      <Icon name="check" size={12} />
      <span>{label}</span>
    </div>
  );
}
