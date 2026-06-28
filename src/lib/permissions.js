// ---------------------------------------------------------------------------
// Permission helpers — mirror the engine's authorization rules so the UI can
// enable/disable affordances and explain *why* something is unavailable,
// instead of letting an action fail silently.
//
// System roles: admin | member | guest
//   admin  -> everything
//   member -> create channel, send, upload, read, manage own messages
//   guest  -> send, read, manage own messages (NO channel creation)
//
// Channel roles (membership): owner | admin | member
//   owner/admin -> edit channel, add/remove members, scoped webhooks
//   member      -> participate only
// ---------------------------------------------------------------------------

export const SYSTEM_ROLES = ["admin", "member", "guest"];

export function isAdmin(user) {
  return user?.role === "admin";
}

export function canCreateChannel(user) {
  return user?.role === "admin" || user?.role === "member";
}

export function canManageUsers(user) {
  return user?.role === "admin";
}

export function canManageGlobalWebhooks(user) {
  return user?.role === "admin";
}

// channelRole is the caller's membership role in a given channel.
export function canAdministerChannel(channelRole) {
  return channelRole === "owner" || channelRole === "admin";
}

export function roleLabel(role) {
  return { admin: "Admin", member: "Member", guest: "Guest" }[role] || role;
}

export function memberRoleLabel(role) {
  return { owner: "Owner", admin: "Admin", member: "Member" }[role] || role;
}

// A short human explanation for why a channel-admin action is unavailable.
export function whyCannotManageChannel(channelRole) {
  if (canAdministerChannel(channelRole)) return null;
  return "Only the channel owner or a channel admin can do this.";
}
