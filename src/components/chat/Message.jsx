import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { api } from "../../api/endpoints.js";
import { clockTime, displayName, parseMentions } from "../../lib/format.js";
import Avatar from "../common/Avatar.jsx";
import Icon from "../common/Icon.jsx";
import FileAttachment from "../common/FileAttachment.jsx";

export default function Message({
  message,
  grouped,
  presence,
  canModerate, // channel owner/admin or system admin can delete others' messages
  onOpenThread,
  onEdited,
  onDeleted,
}) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);

  const QUICK_EMOJI = ["👍", "❤️", "😂", "🎉", "👀", "✅"];

  async function toggleReaction(emoji) {
    setPicker(false);
    const group = (message.reactions || []).find((g) => g.emoji === emoji);
    const mineAlready = group?.user_ids?.includes(user.id);
    try {
      if (mineAlready) await api.removeReaction(message.id, emoji);
      else await api.addReaction(message.id, emoji);
    } catch {
      /* realtime event drives UI; ignore */
    }
  }

  const author = message.author;
  const mine = author?.id === user.id;
  const deleted = !!message.deleted_at;
  const online = author ? presence[author.id]?.online : undefined;
  const canDelete = mine || canModerate;

  async function saveEdit() {
    const next = draft.trim();
    if (!next || next === message.content) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      const updated = await api.editMessage(message.id, next);
      onEdited?.(updated);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this message? This can't be undone.")) return;
    await api.deleteMessage(message.id);
    onDeleted?.(message.id);
  }

  return (
    <div className={`msg ${grouped ? "is-grouped" : ""} ${deleted ? "is-deleted" : ""}`}>
      <div className="msg-rail">
        {grouped ? (
          <span className="msg-rail-time">{clockTime(message.created_at)}</span>
        ) : (
          <Avatar user={author} size={38} online={online} />
        )}
      </div>

      <div className="msg-main">
        {!grouped && (
          <div className="msg-meta">
            <span className="msg-author">{displayName(author)}</span>
            {author?.role === "admin" && <span className="badge badge-admin">Admin</span>}
            <span className="msg-time">{clockTime(message.created_at)}</span>
            {message.edited_at && !deleted && <span className="msg-edited">edited</span>}
          </div>
        )}

        {deleted ? (
          <div className="msg-text msg-text-deleted">This message was deleted.</div>
        ) : editing ? (
          <div className="msg-edit">
            <textarea
              className="textarea"
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                }
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <div className="msg-edit-actions">
              <span className="msg-edit-hint muted">
                <span className="kbd">Esc</span> to cancel · <span className="kbd">Enter</span> to save
              </span>
              <div className="msg-edit-buttons">
                <button className="btn btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={busy}>Save</button>
              </div>
            </div>
          </div>
        ) : message.content ? (
          <div className="msg-text">
            {parseMentions(message.content).map((seg, i) =>
              seg.type === "mention" ? (
                <span key={i} className="mention">{seg.value}</span>
              ) : (
                <span key={i}>{seg.value}</span>
              )
            )}
          </div>
        ) : null}

        {!deleted && message.attachments?.length > 0 && (
          <div className="msg-attachments">
            {message.attachments.map((a) => (
              <FileAttachment key={a.id} att={a} />
            ))}
          </div>
        )}

        {!deleted && message.reply_count > 0 && (
          <button className="msg-replies" onClick={() => onOpenThread?.(message)}>
            <Icon name="thread" size={14} />
            <span>{message.reply_count} {message.reply_count === 1 ? "reply" : "replies"}</span>
            <span className="msg-replies-go">View thread</span>
          </button>
        )}
        {!deleted && message.reactions?.length > 0 && (
          <div className="msg-reactions">
            {message.reactions.map((g) => {
              const mineReacted = g.user_ids?.includes(user.id);
              return (
                <button
                  key={g.emoji}
                  className={`reaction-chip ${mineReacted ? "mine" : ""}`}
                  onClick={() => toggleReaction(g.emoji)}
                  title={mineReacted ? "Remove your reaction" : "React"}
                >
                  <span className="reaction-emoji">{g.emoji}</span>
                  <span className="reaction-count">{g.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!deleted && !editing && (
        <div className="msg-tools">
          <div className="msg-react-wrap">
            <button className="msg-tool" title="Add reaction" onClick={() => setPicker((v) => !v)}>
              <Icon name="smile" size={16} />
            </button>
            {picker && (
              <>
                <div className="msg-react-backdrop" onClick={() => setPicker(false)} />
                <div className="msg-react-picker" role="menu">
                  {QUICK_EMOJI.map((e) => (
                    <button key={e} className="msg-react-opt" onClick={() => toggleReaction(e)} title={e}>
                      {e}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button className="msg-tool" title="Reply in thread" onClick={() => onOpenThread?.(message)}>
            <Icon name="thread" size={16} />
          </button>
          {mine && (
            <button className="msg-tool" title="Edit" onClick={() => setEditing(true)}>
              <Icon name="edit" size={16} />
            </button>
          )}
          {canDelete && (
            <button className="msg-tool danger" title="Delete" onClick={remove}>
              <Icon name="trash" size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
