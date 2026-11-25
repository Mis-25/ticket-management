import { hasPermission } from "@/lib/auth";
import { TicketPermissions, TicketStatus } from "@/types/ticket";
import { SessionUser } from "@/types/user";

export interface TicketAccessInfo {
  status: TicketStatus;
  createdById: number | null;
  assignedToId: number | null;
  managerId: number | null;
}

const ASSIGNABLE: TicketStatus[] = [
  "Open",
  "Assigned",
  "In Progress",
  "On Hold",
  "Reopened",
];
const STARTABLE: TicketStatus[] = ["Assigned", "On Hold", "Reopened"];

export function canViewTicket(user: SessionUser, t: TicketAccessInfo): boolean {
  if (hasPermission(user, "ticket.view_all")) return true;
  if (hasPermission(user, "ticket.view_assigned") && t.assignedToId === user.id)
    return true;
  if (hasPermission(user, "ticket.view_own") && t.createdById === user.id)
    return true;
  if (hasPermission(user, "ticket.assign") && t.managerId === user.id) return true;
  return false;
}

export function getTicketPermissions(
  user: SessionUser,
  t: TicketAccessInfo
): TicketPermissions {
  const can = (p: string) => hasPermission(user, p);
  const isCreator = t.createdById !== null && t.createdById === user.id;
  const isAssignee = t.assignedToId !== null && t.assignedToId === user.id;
  const viewAll = can("ticket.view_all");
  const isStaffOnTicket = viewAll || isAssignee;
  const isClosed = t.status === "Closed";

  const confirmClose =
    can("ticket.close_confirm") && isCreator && t.status === "Resolved";
  const adminClose = can("ticket.close_any") && !isClosed;

  const isTicketManager =
    can("ticket.assign") &&
    (t.managerId === null || t.managerId === user.id || can("user.manage"));

  return {
    assign: isTicketManager && ASSIGNABLE.includes(t.status),
    unassign: isTicketManager && ASSIGNABLE.includes(t.status) && t.assignedToId !== null,
    start:
      can("ticket.start") &&
      isStaffOnTicket &&
      t.assignedToId !== null &&
      STARTABLE.includes(t.status),
    hold: can("ticket.hold") && isStaffOnTicket && t.status === "In Progress",
    resolve:
      can("ticket.resolve") && isStaffOnTicket && t.status === "In Progress",
    close: confirmClose || adminClose,
    closeNeedsReason: !confirmClose,
    reopen:
      can("ticket.reopen") &&
      (isCreator || isTicketManager) &&
      (t.status === "Resolved" || t.status === "Closed"),
    reply:
      can("comment.public") &&
      !isClosed &&
      (isStaffOnTicket || isCreator),
    internalNote: can("comment.internal") && isStaffOnTicket,
    upload: can("attachment.upload") && !isClosed && (isStaffOnTicket || isCreator),
    viewHistory: can("history.view"),
  };
}

export function canSeeInternal(user: SessionUser, t: TicketAccessInfo): boolean {
  return (
    hasPermission(user, "comment.internal") &&
    (hasPermission(user, "ticket.view_all") || t.assignedToId === user.id)
  );
}
