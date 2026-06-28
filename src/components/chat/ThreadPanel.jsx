import { useEffect, useState, useCallback } from "react";
import { api } from "../../api/endpoints.js";
import { useRealtime } from "../../hooks/useRealtime.js";
import Message from "./Message.jsx";
import Composer from "./Composer.jsx";
import Icon from "../common/Icon.jsx";
import { Loading } from "../common/Modal.jsx";

export default function ThreadPanel({ channel, root, presence, canModerate, canPost, onClose }) {
  const [rootMsg, setRootMsg] = useState(root);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRootMsg(root);
    setLoading(true);
    api.thread(root.id).then(setReplies).finally(() => setLoading(false));
  }, [root.id]);

  useRealtime("message_created", (f) => {
    if (f.channel_id !== channel?.id) return;
    if (f.message.parent_id !== rootMsg.id) return;
    setReplies((r) => (r.some((x) => x.id === f.message.id) ? r : [...r, f.message]));
  });
  useRealtime("message_updated", (f) => {
    if (f.message.id === rootMsg.id) setRootMsg(f.message);
    setReplies((r) => r.map((x) => (x.id === f.message.id ? f.message : x)));
  });
  useRealtime("message_deleted", (f) => {
    setReplies((r) =>
      r.map((x) => (x.id === f.message_id ? { ...x, deleted_at: new Date().toISOString(), content: "" } : x))
    );
  });

  const onSent = useCallback((msg) => {
    setReplies((r) => (r.some((x) => x.id === msg.id) ? r : [...r, msg]));
  }, []);

  return (
    <aside className="rightpanel thread">
      <header className="rightpanel-head">
        <div className="rightpanel-title">
          <h3>Thread</h3>
          <span className="muted">{channel.name ? `#${channel.name}` : "Direct message"}</span>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close thread">
          <Icon name="x" size={18} />
        </button>
      </header>

      <div className="rightpanel-body thread-body">
        <div className="thread-root">
          <Message message={rootMsg} presence={presence} canModerate={canModerate} />
        </div>
        <div className="thread-count">
          {(rootMsg.reply_count || replies.length) > 0 && (
            <>
              <span className="thread-count-rule" />
              <span className="muted">
                {rootMsg.reply_count || replies.length}{" "}
                {(rootMsg.reply_count || replies.length) === 1 ? "reply" : "replies"}
              </span>
              <span className="thread-count-rule" />
            </>
          )}
        </div>
        {loading ? (
          <Loading />
        ) : (
          <div className="msg-list">
            {replies.map((m) => (
              <Message key={m.id} message={m} presence={presence} canModerate={canModerate} />
            ))}
          </div>
        )}
      </div>

      <div className="thread-composer">
        <Composer
          channelId={channel.id}
          parentId={rootMsg.id}
          placeholder="Reply…"
          onSent={onSent}
          disabled={!canPost}
          disabledReason="You don't have permission to reply here."
        />
      </div>
    </aside>
  );
}
