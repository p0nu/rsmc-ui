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
  // Email verification, password reset, and email change (0.9.0).
  sendVerification: () => http.post("/users/me/verify-email"),
  verifyEmail: (token) => http.post("/auth/verify-email", { token }),
  requestPasswordReset: (email) => http.post("/auth/password-reset", { email }),
  confirmPasswordReset: (token, new_password) =>
    http.post("/auth/password-reset/confirm", { token, new_password }),
  requestEmailChange: (new_email) => http.post("/users/me/email", { new_email }),
  confirmEmailChange: (token) =>
    http.post("/auth/confirm-email-change", { token }),

  // ---- users ----
  me: () => http.get("/users/me"),
  // Boot variant: a short timeout so a down/slow backend drops to the sign-in
  // screen quickly instead of leaving the app on a loading spinner.
  meBoot: () => http.get("/users/me", { timeoutMs: 8000 }),
  updateMe: (payload) => http.patch("/users/me", payload),
  setStatus: (payload) => http.put("/users/me/status", payload),
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return http.form("/users/me/avatar", fd);
  },
  deleteAvatar: () => http.del("/users/me/avatar"),
  getUser: (id) => http.get(`/users/${id}`),
  listUsers: (q = "", limit = 100) =>
    http.get(`/users?q=${encodeURIComponent(q)}&limit=${limit}`),
  setRole: (id, role) => http.put(`/users/${id}/role`, { role }),
  deactivate: (id) => http.post(`/users/${id}/deactivate`),
  activate: (id) => http.post(`/users/${id}/activate`),

  // ---- channels ----
  createChannel: (payload) => http.post("/channels", payload),
  createDirect: (user_id) => http.post("/channels/direct", { user_id }),
  listChannels: (includeArchived = false) =>
    http.get(`/channels${includeArchived ? "?include_archived=true" : ""}`),
  browseChannels: () => http.get("/channels/browse"),
  joinChannel: (id) => http.post(`/channels/${id}/join`),
  archiveChannel: (id) => http.post(`/channels/${id}/archive`),
  unarchiveChannel: (id) => http.post(`/channels/${id}/unarchive`),
  getChannel: (id) => http.get(`/channels/${id}`),
  updateChannel: (id, payload) => http.patch(`/channels/${id}`, payload),
  listMembers: (id, { limit, cursor } = {}) => {
    const p = new URLSearchParams();
    if (limit) p.set("limit", String(limit));
    if (cursor) p.set("cursor", cursor);
    const qs = p.toString();
    return http.get(`/channels/${id}/members${qs ? `?${qs}` : ""}`);
  },
  markChannelRead: (id) => http.post(`/channels/${id}/read`),
  channelReceipts: (id) => http.get(`/channels/${id}/receipts`),
  setChannelMute: (id, muted) => http.patch(`/channels/${id}/mute`, { muted }),
  addMember: (id, user_id) => http.post(`/channels/${id}/members`, { user_id }),
  removeMember: (id, user_id) => http.del(`/channels/${id}/members/${user_id}`),

  // ---- messages ----
  sendMessage: (channelId, payload) => http.post(`/channels/${channelId}/messages`, payload),
  addReaction: (messageId, emoji) => http.post(`/messages/${messageId}/reactions`, { emoji }),
  removeReaction: (messageId, emoji) => http.del(`/messages/${messageId}/reactions`, { emoji }),
  history: (channelId, { limit = 50, before, after } = {}) => {
    const p = new URLSearchParams({ limit: String(limit) });
    if (before) p.set("before", before);
    if (after) p.set("after", after);
    return http.get(`/channels/${channelId}/messages?${p}`);
  },
  thread: (messageId) => http.get(`/messages/${messageId}/thread`),
  editMessage: (messageId, content) => http.patch(`/messages/${messageId}`, { content }),
  deleteMessage: (messageId) => http.del(`/messages/${messageId}`),
  pinMessage: (messageId) => http.post(`/messages/${messageId}/pin`),
  unpinMessage: (messageId) => http.del(`/messages/${messageId}/pin`),
  channelPins: (channelId, { limit, cursor } = {}) => {
    const p = new URLSearchParams();
    if (limit) p.set("limit", String(limit));
    if (cursor) p.set("cursor", cursor);
    const qs = p.toString();
    return http.get(`/channels/${channelId}/pins${qs ? `?${qs}` : ""}`);
  },
  search: (q, { channelId, limit = 30 } = {}) => {
    const p = new URLSearchParams({ q, limit: String(limit) });
    if (channelId) p.set("channel_id", channelId);
    return http.get(`/search?${p}`);
  },

  // ---- scheduled messages ----
  scheduleMessage: (channelId, payload) =>
    http.post(`/channels/${channelId}/scheduled`, payload),
  listScheduled: (channelId) => http.get(`/channels/${channelId}/scheduled`),
  cancelScheduled: (id) => http.del(`/scheduled/${id}`),

  // ---- drafts ----
  getDraft: (channelId) => http.get(`/channels/${channelId}/draft`),
  saveDraft: (channelId, content) =>
    http.put(`/channels/${channelId}/draft`, { content }),

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
  systemStats: () => http.get("/system/stats"),
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
