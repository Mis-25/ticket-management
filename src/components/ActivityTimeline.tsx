import { StatusBadge } from "@/components/Badges";
import { formatDateTime } from "@/lib/format";
import { ActivityEntry, isTicketStatus } from "@/types/ticket";

/** Value agar status hai to rangeen badge, warna plain text */
function Value({ value }: { value: string | null }) {
  if (!value) return <span className="timeline-empty">—</span>;
  return isTicketStatus(value) ? <StatusBadge status={value} /> : <strong>{value}</strong>;
}

/**
 * Transaction / Activity history — har action: kisne, kya, purana → naya,
 * kab, aur remarks. Sirf padhne ke liye.
 */
export default function ActivityTimeline({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return <p className="reply-empty">No activity recorded yet.</p>;
  }

  return (
    <ol className="timeline">
      {entries.map((entry) => (
        <li key={entry.id} className="timeline-item">
          <span className="timeline-dot" aria-hidden="true" />
          <div className="timeline-body">
            <div className="timeline-head">
              <p className="timeline-action">{entry.actionType}</p>
              <p className="reply-date">{formatDateTime(entry.createdAt)}</p>
            </div>
            <p className="timeline-user">by {entry.user.name}</p>
            {entry.oldValue ? (
              <p className="timeline-change">
                <Value value={entry.oldValue} />
                <span aria-label="changed to"> → </span>
                <Value value={entry.newValue} />
              </p>
            ) : (
              entry.newValue && (
                <p className="timeline-change">
                  <Value value={entry.newValue} />
                </p>
              )
            )}
            {entry.description && (
              <p className="timeline-remarks">{entry.description}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
