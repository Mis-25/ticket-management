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

export function statusToCode(status: TicketStatus): number {
  return TICKET_STATUSES.indexOf(status);
}

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

export interface Process {
  id: number;
  name: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  process: Process | null;
  status: TicketStatus;
  createdBy: UserRef | null;
  assignedTo: UserRef | null;
  assignedAt: string | null;
  manager: UserRef | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  reopenedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketPermissions {
  assign: boolean;
  unassign: boolean;
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
  "unassign",
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
  managerId: number;
}

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  processId?: number;
  assignedTo?: number | "unassigned" | "me";
  from?: string;
  to?: string;
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

export const PROCESS_NAME_MAX = 100;

export interface ProcessRow extends Process {
  sortOrder: number;
  isActive: boolean;
  ticketCount: number;
  createdAt: string;
}

export interface ProcessInput {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type ProcessErrors = Partial<Record<"name" | "sortOrder", string>>;

export function validateProcess(input: ProcessInput): ProcessErrors {
  const errors: ProcessErrors = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name === "") errors.name = "Process name is required.";
    else if (name.length > PROCESS_NAME_MAX)
      errors.name = `Process name must be at most ${PROCESS_NAME_MAX} characters.`;
  }
  if (input.sortOrder !== undefined) {
    if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0 || input.sortOrder > 9999)
      errors.sortOrder = "Order must be a whole number between 0 and 9999.";
  }
  return errors;
}
