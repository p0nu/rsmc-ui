import { avatarColor, initials } from "../../lib/format.js";

export default function Avatar({ user, size = 36, online, square = true }) {
  const color = avatarColor(user?.id || user?.username || "");
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        borderRadius: square ? Math.max(6, size * 0.28) : "50%",
        fontSize: size * 0.4,
      }}
    >
      {user?.avatar_url ? (
        <img src={user.avatar_url} alt="" style={{ borderRadius: "inherit" }} />
      ) : (
        <span
          className="avatar-fallback"
          style={{ background: color, borderRadius: "inherit" }}
        >
          {initials(user)}
        </span>
      )}
      {online != null && (
        <span
          className={`avatar-presence presence sm ${online ? "online" : ""}`}
        />
      )}
    </span>
  );
}
