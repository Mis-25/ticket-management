// Saare allowed status. Database (tickets.status, SMALLINT) me iska INDEX
// number save hota hai:
//   0 = Open, 1 = Assigned, 2 = In Progress, 3 = On Hold,
//   4 = Resolved, 5 = Closed, 6 = Reopened
// Order mat badlo, warna database ke purane number galat status dikhayenge.
export const TICKET_STATUSES = [
  "Open",
  "Assigned",
  "In Progress",
  "On Hold",
  "Resolved",
  "Closed",
  "Reopened",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

/** Status naam → database code (e.g. "Closed" → 5) */
export function statusToCode(status: TicketStatus): number {
  return TICKET_STATUSES.indexOf(status);
}

/** Database code → status naam (e.g. 5 → "Closed") */
export function codeToStatus(code: number): TicketStatus {
  const status = TICKET_STATUSES[code];
  if (!status) throw new Error(`Unknown ticket status code: ${code}`);
  return status;
}

export function isTicketStatus(value: unknown): value is TicketStatus {
  return (
    typeof value === "string" &&
    (TICKET_STATUSES as readonly string[]).includes(value)
  );
}

export function isTicketPriority(value: unknown): value is TicketPriority {
  return (
    typeof value === "string" &&
    (TICKET_PRIORITIES as readonly string[]).includes(value)
  );
}

export interface UserRef {
  id: number;
  name: string;
}

/** Company process (processes table) */
export interface Process {
  id: number;
  name: string;
}

export interface Ticket {
  id: string; // ticket_number, e.g. "TKT-6"
  title: string; // UI me "Subject"
  description: string;
  priority: TicketPriority;
  process: Process | null; // purane tickets me null
  status: TicketStatus;
  createdBy: UserRef | null;
  assignedTo: UserRef | null;
  assignedAt: string | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  reopenedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Logged-in user is ticket par kya kar sakta hai (backend calculate karta hai). */
export interface TicketPermissions {
  assign: boolean;
  start: boolean;
  hold: boolean;
  resolve: boolean;
  close: boolean;
  closeNeedsReason: boolean;
  reopen: boolean;
  reply: boolean;
  internalNote: boolean;
  upload: boolean;
  viewHistory: boolean;
}

export interface TicketDetail extends Ticket {
  can: TicketPermissions;
}

export const TICKET_ACTIONS = [
  "assign",
  "start",
  "hold",
  "resolve",
  "close",
  "reopen",
] as const;
export type TicketAction = (typeof TICKET_ACTIONS)[number];

export interface TicketActionInput {
  action: TicketAction;
  reason?: string;
  assigneeId?: number;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  priority: TicketPriority;
  processId: number;
}

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: number | "unassigned";
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

export type TicketStats = { total: number } & Record<TicketStatus, number>;

export interface ActivityEntry {
  id: number;
  actionType: string;
  oldValue: string | null;
  newValue: string | null;
  description: string | null;
  createdAt: string;
  user: UserRef;
}

export interface TicketAttachment {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  uploadedBy: UserRef;
}

export const REASON_LIMIT = 2000;
