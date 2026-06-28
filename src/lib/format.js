// Presentation helpers: time, names, avatars, mentions, file sizes.

export function displayName(u) {
  if (!u) return "Unknown";
  return u.display_name || u.username || "Unknown";
}

export function clockTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, yest)) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

export function fileSize(bytes) {
  if (bytes == null) return "";
  const u = ["B", "KB", "MB", "GB"];
  let n = bytes,
    i = 0;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

const AVATAR_COLORS = [
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
];
export function avatarColor(seed = "") {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function initials(u) {
  const n = displayName(u).trim();
  const parts = n.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

export function channelName(ch, selfId) {
  if (!ch) return "";
  if (ch.name) return ch.name;
  if (ch.channel_type === "direct") return ch.peer ? displayName(ch.peer) : "Direct message";
  return "untitled";
}

export function channelPrefix(ch) {
  if (!ch) return "#";
  if (ch.channel_type === "direct") return "";
  if (ch.channel_type === "private") return "🔒";
  return "#";
}

// Split content into text + @mention segments for highlighting.
export function parseMentions(content) {
  const out = [];
  const re = /(@[a-zA-Z0-9_.-]{2,})/g;
  let last = 0,
    m;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) out.push({ type: "text", value: content.slice(last, m.index) });
    out.push({ type: "mention", value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < content.length) out.push({ type: "text", value: content.slice(last) });
  return out;
}

export function slugifyChannel(s) {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 40);
}
