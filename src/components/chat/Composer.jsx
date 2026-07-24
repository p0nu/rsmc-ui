import { useRef, useState, useCallback } from "react";
import { api } from "../../api/endpoints.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { fileSize } from "../../lib/format.js";
import { useDraft } from "../../hooks/useDraft.js";
import Icon from "../common/Icon.jsx";

// Build the preset schedule options relative to now: in 1 hour, tomorrow 9am,
// and next Monday 9am. Returns [{ label, date }].
function schedulePresets() {
  const now = new Date();

  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

  const tomorrow9 = new Date(now);
  tomorrow9.setDate(now.getDate() + 1);
  tomorrow9.setHours(9, 0, 0, 0);

  const monday9 = new Date(now);
  const day = monday9.getDay(); // 0=Sun..6=Sat
  const daysUntilMonday = ((8 - day) % 7) || 7; // always the *next* Monday
  monday9.setDate(now.getDate() + daysUntilMonday);
  monday9.setHours(9, 0, 0, 0);

  return [
    { key: "1hr", label: "In 1 hour", date: inOneHour },
    { key: "tomorrow", label: "Tomorrow at 9:00 AM", date: tomorrow9 },
    { key: "monday", label: "Monday at 9:00 AM", date: monday9 },
  ];
}

export default function Composer({ channelId, parentId = null, placeholder, onSent, onScheduled, disabled, disabledReason }) {
  const { rt } = useAuth();
  const toast = useToast();
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const fileRef = useRef(null);
  const lastTyping = useRef(0);
  const inputRef = useRef(null);

  // Drafts: only the main channel composer persists (not thread replies).
  const { save: saveDraft, clear: clearDraft } = useDraft(channelId, {
    enabled: !parentId,
    onRestore: (content) => {
      setText(content);
      // Resize the textarea to fit restored content on the next frame.
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          el.style.height = "auto";
          el.style.height = Math.min(el.scrollHeight, 220) + "px";
        }
      });
    },
  });

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

  // Broadcast mentions that notify the whole channel. Surfaced alongside user
  // results in the autocomplete when they prefix-match the query.
  const BROADCAST_MENTIONS = [
    { username: "channel", broadcast: true, display_name: "Notify everyone in this channel" },
    { username: "here", broadcast: true, display_name: "Notify active members" },
    { username: "everyone", broadcast: true, display_name: "Notify everyone in this channel" },
  ];

  // Debounced user lookup when a mention is active.
  const runMentionSearch = useCallback((query) => {
    if (mentionTimer.current) clearTimeout(mentionTimer.current);
    const q = query.toLowerCase();
    const broadcasts = BROADCAST_MENTIONS.filter((b) => b.username.startsWith(q));
    mentionTimer.current = setTimeout(async () => {
      try {
        const users = await api.listUsers(query, 6);
        const list = Array.isArray(users) ? users : [];
        // Broadcast options first, then matching users.
        setMentionResults([...broadcasts, ...list]);
        setMentionIdx(0);
      } catch {
        setMentionResults(broadcasts);
      }
    }, 150);
  }, []);

  function onTextChange(e) {
    const value = e.target.value;
    setText(value);
    emitTyping();
    saveDraft(value);
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
      clearDraft();
      onSent?.(msg);
    } catch (err) {
      toast.error("Message not sent", err.message);
    } finally {
      setSending(false);
    }
  }

  async function schedule(date) {
    const content = text.trim();
    if (!content) {
      toast.error("Nothing to schedule", "Type a message first.");
      return;
    }
    if (!date || isNaN(date.getTime())) {
      toast.error("Pick a time", "That date didn't look right.");
      return;
    }
    if (date.getTime() <= Date.now()) {
      toast.error("Pick a future time", "Scheduled time must be later than now.");
      return;
    }
    setSending(true);
    try {
      await api.scheduleMessage(channelId, {
        content,
        parent_id: parentId,
        scheduled_for: date.toISOString(),
      });
      setText("");
      clearDraft();
      setScheduleOpen(false);
      setCustomOpen(false);
      setCustomValue("");
      toast.success("Message scheduled", date.toLocaleString());
      onScheduled?.();
    } catch (err) {
      toast.error("Couldn't schedule", err.message);
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
                key={u.broadcast ? `bc:${u.username}` : u.id}
                className={`mention-opt ${i === mentionIdx ? "active" : ""} ${u.broadcast ? "is-broadcast" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyMention(u);
                }}
                role="option"
                aria-selected={i === mentionIdx}
              >
                <span className="mention-opt-name">
                  {u.broadcast ? `@${u.username}` : (u.display_name || u.username)}
                </span>
                <span className="mention-opt-handle">
                  {u.broadcast ? u.display_name : `@${u.username}`}
                </span>
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

        {/* Scheduling is offered for normal channel messages, not thread replies. */}
        {!parentId && (
          <div className="composer-schedule-wrap">
            <button
              type="button"
              className={`composer-tool ${scheduleOpen ? "active" : ""}`}
              onClick={() => {
                setScheduleOpen((v) => !v);
                setCustomOpen(false);
              }}
              title="Schedule for later"
              aria-label="Schedule for later"
              disabled={!text.trim()}
            >
              <Icon name="clock" size={18} />
            </button>
            {scheduleOpen && (
              <>
                <div className="composer-schedule-backdrop" onClick={() => setScheduleOpen(false)} />
                <div className="composer-schedule-pop" role="menu">
                  <div className="composer-schedule-head">Schedule message</div>
                  {schedulePresets().map((p) => (
                    <button
                      key={p.key}
                      className="composer-schedule-opt"
                      onClick={() => schedule(p.date)}
                    >
                      {p.label}
                    </button>
                  ))}
                  {customOpen ? (
                    <div className="composer-schedule-custom">
                      <input
                        type="datetime-local"
                        className="input"
                        value={customValue}
                        onChange={(e) => setCustomValue(e.target.value)}
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => schedule(new Date(customValue))}
                        disabled={!customValue}
                      >
                        Schedule
                      </button>
                    </div>
                  ) : (
                    <button
                      className="composer-schedule-opt composer-schedule-custom-open"
                      onClick={() => setCustomOpen(true)}
                    >
                      Custom time…
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

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
