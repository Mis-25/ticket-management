import { TicketPriority, TicketStatus } from "@/types/ticket";

// Har status ka apna rang (globals.css me .badge-status-*)
const STATUS_CLASS: Record<TicketStatus, string> = {
  Open: "badge-open",
  Assigned: "badge-assigned",
  "In Progress": "badge-progress",
  "On Hold": "badge-hold",
  Resolved: "badge-resolved",
  Closed: "badge-closed",
  Reopened: "badge-reopened",
};

const PRIORITY_CLASS: Record<TicketPriority, string> = {
  Low: "priority-low",
  Medium: "priority-medium",
  High: "priority-high",
  Critical: "priority-critical",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <span className={`badge ${STATUS_CLASS[status]}`}>{status}</span>;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <span className={`badge ${PRIORITY_CLASS[priority]}`}>{priority}</span>;
}
