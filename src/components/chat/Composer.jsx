import { useRef, useState, useCallback } from "react";
import { api } from "../../api/endpoints.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { fileSize } from "../../lib/format.js";
import Icon from "../common/Icon.jsx";

export default function Composer({ channelId, parentId = null, placeholder, onSent, disabled, disabledReason }) {
  const { rt } = useAuth();
  const toast = useToast();
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);
  const lastTyping = useRef(0);
  const inputRef = useRef(null);

  // @mention autocomplete state
  const [mention, setMention] = useState(null); // { query, start } | null
  const [mentionResults, setMentionResults] = useState([]);
  const [mentionIdx, setMentionIdx] = useState(0);
  const mentionTimer = useRef(null);

  // Detect an in-progress "@query" immediately before the caret.
  const detectMention = useCallback((value, caret) => {
    const upTo = value.slice(0, caret);
    const m = upTo.match(/(?:^|\s)@([\w.]*)$/);
    if (!m) return null;
    return { query: m[1], start: caret - m[1].length - 1 };
  }, []);

  // Debounced user lookup when a mention is active.
  const runMentionSearch = useCallback((query) => {
    if (mentionTimer.current) clearTimeout(mentionTimer.current);
    mentionTimer.current = setTimeout(async () => {
      try {
        const users = await api.listUsers(query, 6);
        setMentionResults(Array.isArray(users) ? users : []);
        setMentionIdx(0);
      } catch {
        setMentionResults([]);
      }
    }, 150);
  }, []);

  function onTextChange(e) {
    const value = e.target.value;
    setText(value);
    emitTyping();
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 220) + "px";
    const m = detectMention(value, e.target.selectionStart);
    setMention(m);
    if (m) runMentionSearch(m.query);
    else setMentionResults([]);
  }

  function applyMention(u) {
    if (!mention) return;
    const before = text.slice(0, mention.start);
    const after = text.slice(inputRef.current?.selectionStart ?? text.length);
    const next = `${before}@${u.username} ${after}`;
    setText(next);
    setMention(null);
    setMentionResults([]);
    requestAnimationFrame(() => {
      const pos = before.length + u.username.length + 2;
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(pos, pos);
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 220) + "px";
      }
    });
  }

  const emitTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTyping.current > 2500) {
      lastTyping.current = now;
      rt.typing(channelId);
    }
  }, [rt, channelId]);

  async function pickFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const res = await api.uploadFile(file);
        setAttachments((a) => [...a, res]);
      }
    } catch (err) {
      toast.error("Upload failed", err.message);
    } finally {
      setUploading(false);
    }
  }

  async function send() {
    const content = text.trim();
    if (!content && attachments.length === 0) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(channelId, {
        content,
        parent_id: parentId,
        attachment_ids: attachments.map((a) => a.id),
      });
      setText("");
      setAttachments([]);
      onSent?.(msg);
    } catch (err) {
      toast.error("Message not sent", err.message);
    } finally {
      setSending(false);
    }
  }

  if (disabled) {
    return (
      <div className="composer-disabled">
        <Icon name="lock" size={16} />
        <span>{disabledReason || "You can't post in this channel."}</span>
      </div>
    );
  }

  return (
    <div className="composer">
      {attachments.length > 0 && (
        <div className="composer-attachments">
          {attachments.map((a) => (
            <div key={a.id} className="composer-chip">
              <Icon name="file" size={15} />
              <span className="composer-chip-name">{a.filename}</span>
              <span className="composer-chip-size">{fileSize(a.size_bytes)}</span>
              <button
                className="composer-chip-x"
                onClick={() => setAttachments((p) => p.filter((x) => x.id !== a.id))}
                aria-label="Remove"
              >
                <Icon name="x" size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="composer-box">
        <textarea
          ref={inputRef}
          className="composer-input"
          value={text}
          placeholder={placeholder}
          rows={1}
          onChange={onTextChange}
          onKeyDown={(e) => {
            if (mention && mentionResults.length > 0) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setMentionIdx((i) => (i + 1) % mentionResults.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setMentionIdx((i) => (i - 1 + mentionResults.length) % mentionResults.length);
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                applyMention(mentionResults[mentionIdx]);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setMention(null);
                setMentionResults([]);
                return;
              }
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
              e.target.style.height = "auto";
            }
          }}
        />
        {mention && mentionResults.length > 0 && (
          <div className="mention-pop" role="listbox">
            {mentionResults.map((u, i) => (
              <button
                key={u.id}
                className={`mention-opt ${i === mentionIdx ? "active" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyMention(u);
                }}
                role="option"
                aria-selected={i === mentionIdx}
              >
                <span className="mention-opt-name">{u.display_name || u.username}</span>
                <span className="mention-opt-handle">@{u.username}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="composer-actions">
        <button
          type="button"
          className="composer-tool"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Attach files"
          aria-label="Attach files"
        >
          {uploading ? <span className="spinner" /> : <Icon name="paperclip" size={18} />}
        </button>
        <input ref={fileRef} type="file" multiple hidden onChange={pickFiles} />

        <div className="composer-spacer" />

        <button
          type="button"
          className="btn btn-primary btn-sm composer-send"
          onClick={send}
          disabled={sending || (!text.trim() && attachments.length === 0)}
        >
          {sending ? <span className="spinner on-brand" /> : <Icon name="send" size={15} />}
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}
