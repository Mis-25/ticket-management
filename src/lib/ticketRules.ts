import { hasPermission } from "@/lib/auth";
import { TicketPermissions, TicketStatus } from "@/types/ticket";
import { SessionUser } from "@/types/user";

/**
 * Ticket ke saare workflow + permission rules EK jagah.
 * Backend har action se pehle yahi check karta hai, aur frontend ko bhi
 * yahi result bhejta hai taaki sirf allowed buttons dikhein.
 *
 * Workflow:
 *   Open → Assigned → In Progress → Resolved → Closed
 *   In Progress ↔ On Hold
 *   Resolved / Closed → Reopened → Assigned / In Progress
 */

export interface TicketAccessInfo {
  status: TicketStatus;
  createdById: number | null;
  assignedToId: number | null;
}

/** Status jinse "assign / reassign" allowed hai */
const ASSIGNABLE: TicketStatus[] = [
  "Open",
  "Assigned",
  "In Progress",
  "On Hold",
  "Reopened",
];
/** Status jinse "start work" (→ In Progress) allowed hai */
const STARTABLE: TicketStatus[] = ["Assigned", "On Hold", "Reopened"];

export function canViewTicket(user: SessionUser, t: TicketAccessInfo): boolean {
  if (hasPermission(user, "ticket.view_all")) return true;
  if (hasPermission(user, "ticket.view_assigned") && t.assignedToId === user.id)
    return true;
  if (hasPermission(user, "ticket.view_own") && t.createdById === user.id)
    return true;
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
  // Admin har ticket par, Support Agent sirf apne assigned ticket par
  const isStaffOnTicket = viewAll || isAssignee;
  const isClosed = t.status === "Closed";

  const confirmClose =
    can("ticket.close_confirm") && isCreator && t.status === "Resolved";
  const adminClose = can("ticket.close_any") && !isClosed;

  return {
    assign: can("ticket.assign") && ASSIGNABLE.includes(t.status),
    start:
      can("ticket.start") &&
      isStaffOnTicket &&
      t.assignedToId !== null &&
      STARTABLE.includes(t.status),
    hold: can("ticket.hold") && isStaffOnTicket && t.status === "In Progress",
    resolve:
      can("ticket.resolve") && isStaffOnTicket && t.status === "In Progress",
    close: confirmClose || adminClose,
    // Employee "Resolved" ko confirm kare to reason optional; Admin close = reason zaroori
    closeNeedsReason: !confirmClose,
    // Reopen sirf ticket banane wala (creator) kar sakta hai
    reopen:
      can("ticket.reopen") &&
      isCreator &&
      (t.status === "Resolved" || t.status === "Closed"),
    // Closed ticket par public reply band
    reply:
      can("comment.public") &&
      !isClosed &&
      (isStaffOnTicket || isCreator),
    internalNote: can("comment.internal") && isStaffOnTicket,
    upload: can("attachment.upload") && !isClosed && (isStaffOnTicket || isCreator),
    viewHistory: can("history.view"),
  };
}

/** Internal notes sirf Admin / assigned Support Agent dekh sakte hain. */
export function canSeeInternal(user: SessionUser, t: TicketAccessInfo): boolean {
  return (
    hasPermission(user, "comment.internal") &&
    (hasPermission(user, "ticket.view_all") || t.assignedToId === user.id)
  );
}
