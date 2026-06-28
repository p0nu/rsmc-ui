import Message from "./Message.jsx";
import { dayLabel } from "../../lib/format.js";

export default function MessageList({ messages, presence, canModerate, onOpenThread, onEdited, onDeleted }) {
  const rows = [];
  let lastDay = null;
  let lastAuthor = null;
  let lastTime = 0;

  for (const m of messages) {
    const day = dayLabel(m.created_at);
    if (day !== lastDay) {
      rows.push(<DayDivider key={`day-${m.id}`} label={day} />);
      lastDay = day;
      lastAuthor = null;
    }
    const t = new Date(m.created_at).getTime();
    const grouped = m.author?.id === lastAuthor && t - lastTime < 5 * 60 * 1000 && !m.deleted_at;
    rows.push(
      <Message
        key={m.id}
        message={m}
        grouped={grouped}
        presence={presence}
        canModerate={canModerate}
        onOpenThread={onOpenThread}
        onEdited={onEdited}
        onDeleted={onDeleted}
      />
    );
    lastAuthor = m.author?.id;
    lastTime = t;
  }

  return <div className="msg-list">{rows}</div>;
}

function DayDivider({ label }) {
  return (
    <div className="day-divider">
      <span className="day-divider-rule" />
      <span className="day-divider-label">{label}</span>
      <span className="day-divider-rule" />
    </div>
  );
}
