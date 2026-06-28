// ---------------------------------------------------------------------------
// One function per collab-engine endpoint. Response shapes verified against the
// engine source (note: status replies are { ok: true }, unread count is
// { unread: N }).
// ---------------------------------------------------------------------------
import { http } from "./client.js";

export const api = {
  // ---- auth ----
  signup: (payload) => http.post("/auth/signup", payload),
  login: (email, password) => http.post("/auth/login", { email, password }),
  logout: () => http.post("/auth/logout"),

  // ---- users ----
  me: () => http.get("/users/me"),
  // Boot variant: a short timeout so a down/slow backend drops to the sign-in
  // screen quickly instead of leaving the app on a loading spinner.
  meBoot: () => http.get("/users/me", { timeoutMs: 8000 }),
  updateMe: (payload) => http.patch("/users/me", payload),
  getUser: (id) => http.get(`/users/${id}`),
  listUsers: (q = "", limit = 100) =>
    http.get(`/users?q=${encodeURIComponent(q)}&limit=${limit}`),
  setRole: (id, role) => http.put(`/users/${id}/role`, { role }),
  deactivate: (id) => http.post(`/users/${id}/deactivate`),
  activate: (id) => http.post(`/users/${id}/activate`),

  // ---- channels ----
  createChannel: (payload) => http.post("/channels", payload),
  createDirect: (user_id) => http.post("/channels/direct", { user_id }),
  listChannels: () => http.get("/channels"),
  getChannel: (id) => http.get(`/channels/${id}`),
  updateChannel: (id, payload) => http.patch(`/channels/${id}`, payload),
  listMembers: (id) => http.get(`/channels/${id}/members`),
  addMember: (id, user_id) => http.post(`/channels/${id}/members`, { user_id }),
  removeMember: (id, user_id) => http.del(`/channels/${id}/members/${user_id}`),

  // ---- messages ----
  sendMessage: (channelId, payload) => http.post(`/channels/${channelId}/messages`, payload),
  history: (channelId, { limit = 50, before, after } = {}) => {
    const p = new URLSearchParams({ limit: String(limit) });
    if (before) p.set("before", before);
    if (after) p.set("after", after);
    return http.get(`/channels/${channelId}/messages?${p}`);
  },
  thread: (messageId) => http.get(`/messages/${messageId}/thread`),
  editMessage: (messageId, content) => http.patch(`/messages/${messageId}`, { content }),
  deleteMessage: (messageId) => http.del(`/messages/${messageId}`),

  // ---- files ----
  uploadFile: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return http.form("/files", fd);
  },
  fileUrl: (id) => `/api/v1/files/${id}`,
  // Authenticated fetch of a file's bytes as a Blob (for inline images and
  // downloads); the raw fileUrl can't carry the auth header from an <img>/<a>.
  fileBlob: (id) => http.blob(`/files/${id}`),

  // ---- notifications ----
  notifications: (unreadOnly = false, limit = 60) =>
    http.get(`/notifications?unread_only=${unreadOnly}&limit=${limit}`),
  unreadCount: () => http.get("/notifications/unread_count"), // -> { unread: N }
  markRead: (id) => http.post(`/notifications/${id}/read`),
  markAllRead: () => http.post("/notifications/read_all"),

  // ---- presence ----
  presence: (userId) => http.get(`/presence/${userId}`),
  bulkPresence: (user_ids) => http.post("/presence/bulk", { user_ids }),

  // ---- webhooks ----
  createWebhook: (payload) => http.post("/webhooks", payload),
  listWebhooks: () => http.get("/webhooks"),
  deleteWebhook: (id) => http.del(`/webhooks/${id}`),

  // ---- system (admin) ----
  systemInfo: () => http.get("/system/info"),
  listBackups: () => http.get("/system/backups"),
  backupDatabase: (path) => http.post("/system/backup", path ? { path } : {}),
  restoreDatabase: (path) => http.post("/system/restore", { path, confirm: true }),

  // ---- app links (workspace bookmarks) ----
  listAppLinks: () => http.get("/app-links"),
  createAppLink: (payload) => http.post("/app-links", payload),
  deleteAppLink: (id) => http.del(`/app-links/${id}`),

  // ---- health ----
  ready: () => http.get("/readyz"),
};
