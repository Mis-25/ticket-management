import { PoolClient } from "pg";
import { hasPermission } from "@/lib/auth";
import { pool, withTransaction } from "@/lib/db";
import { badRequest, forbidden, HttpError, notFound } from "@/lib/httpError";
import {
  canViewTicket,
  getTicketPermissions,
  TicketAccessInfo,
} from "@/lib/ticketRules";
import { findActiveProcess } from "@/services/processService";
import { findUserWithPermission } from "@/services/userService";
import {
  codeToStatus,
  CreateTicketInput,
  REASON_LIMIT,
  statusToCode,
  Ticket,
  TICKET_STATUSES,
  TicketActionInput,
  TicketDetail,
  TicketFilters,
  TicketStats,
  TicketStatus,
} from "@/types/ticket";
import { SessionUser } from "@/types/user";

export const ID_PREFIX = "TKT-";

export function parseTicketId(id: string): number | null {
  const numericId = Number(id.replace(ID_PREFIX, ""));
  return Number.isInteger(numericId) && numericId > 0 ? numericId : null;
}

interface TicketRow {
  id: number;
  ticket_number: string;
  title: string;
  description: string;
  priority: Ticket["priority"];
  process_id: number | null;
  process_name: string | null;
  status: number;
  created_by: number | null;
  created_by_name: string | null;
  assigned_to: number | null;
  assigned_to_name: string | null;
  assigned_at: Date | null;
  manager_id: number | null;
  manager_name: string | null;
  resolution_note: string | null;
  resolved_at: Date | null;
  closed_at: Date | null;
  reopened_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const TICKET_SELECT = `
  SELECT t.id, t.ticket_number, t.title, t.description, t.priority, t.status,
         t.process_id, pr.name AS process_name,
         t.created_by, cb.name AS created_by_name,
         t.assigned_to, at.name AS assigned_to_name, t.assigned_at,
         t.manager_id, mg.name AS manager_name,
         t.resolution_note, t.resolved_at, t.closed_at, t.reopened_at,
         t.created_at, t.updated_at
  FROM tickets t
  LEFT JOIN users cb ON cb.id = t.created_by
  LEFT JOIN users at ON at.id = t.assigned_to
  LEFT JOIN users mg ON mg.id = t.manager_id
  LEFT JOIN processes pr ON pr.id = t.process_id`;

const iso = (d: Date | null) => (d ? d.toISOString() : null);

function toTicket(row: TicketRow): Ticket {
  return {
    id: row.ticket_number,
    title: row.title,
    description: row.description,
    priority: row.priority,
    process:
      row.process_id !== null
        ? { id: row.process_id, name: row.process_name ?? "Unknown" }
        : null,
    status: codeToStatus(row.status),
    createdBy:
      row.created_by !== null
        ? { id: row.created_by, name: row.created_by_name ?? "Unknown" }
        : null,
    assignedTo:
      row.assigned_to !== null
        ? { id: row.assigned_to, name: row.assigned_to_name ?? "Unknown" }
        : null,
    assignedAt: iso(row.assigned_at),
    manager:
      row.manager_id !== null
        ? { id: row.manager_id, name: row.manager_name ?? "Unknown" }
        : null,
    resolutionNote: row.resolution_note,
    resolvedAt: iso(row.resolved_at),
    closedAt: iso(row.closed_at),
    reopenedAt: iso(row.reopened_at),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function accessInfo(row: TicketRow): TicketAccessInfo {
  return {
    status: codeToStatus(row.status),
    createdById: row.created_by,
    assignedToId: row.assigned_to,
    managerId: row.manager_id,
  };
}

function scopeCondition(
  user: SessionUser,
  params: unknown[]
): string | null {
  if (hasPermission(user, "ticket.view_all")) return "TRUE";
  const parts: string[] = [];
  if (hasPermission(user, "ticket.view_assigned")) {
    params.push(user.id);
    parts.push(`t.assigned_to = $${params.length}`);
  }
  if (hasPermission(user, "ticket.view_own")) {
    params.push(user.id);
    parts.push(`t.created_by = $${params.length}`);
  }
  if (hasPermission(user, "ticket.assign")) {
    params.push(user.id);
    parts.push(`t.manager_id = $${params.length}`);
  }
  return parts.length ? `(${parts.join(" OR ")})` : null;
}

export async function listTickets(
  user: SessionUser,
  filters: TicketFilters
): Promise<Ticket[]> {
  const params: unknown[] = [];
  const scope = scopeCondition(user, params);
  if (!scope) return [];

  const where = [scope, "t.deleted_at IS NULL"];
  if (filters.status) {
    params.push(statusToCode(filters.status));
    where.push(`t.status = $${params.length}`);
  }
  if (filters.priority) {
    params.push(filters.priority);
    where.push(`t.priority = $${params.length}`);
  }
  if (filters.processId) {
    params.push(filters.processId);
    where.push(`t.process_id = $${params.length}`);
  }
  if (filters.assignedTo === "unassigned") {
    where.push("t.assigned_to IS NULL");
  } else if (filters.assignedTo) {
    params.push(filters.assignedTo);
    where.push(`t.assigned_to = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    where.push(`t.created_at >= $${params.length}::date`);
  }
  if (filters.to) {
    params.push(filters.to);
    where.push(`t.created_at < ($${params.length}::date + 1)`);
  }

  const result = await pool.query<TicketRow>(
    `${TICKET_SELECT}
     WHERE ${where.join(" AND ")}
     ORDER BY t.created_at DESC, t.id DESC`,
    params
  );
  return result.rows.map(toTicket);
}

export async function getTicketStats(user: SessionUser): Promise<TicketStats> {
  const stats = { total: 0 } as TicketStats;
  for (const s of TICKET_STATUSES) stats[s] = 0;

  const params: unknown[] = [];
  const scope = scopeCondition(user, params);
  if (!scope) return stats;

  const result = await pool.query<{ status: number; count: number }>(
    `SELECT t.status, COUNT(*)::int AS count
     FROM tickets t WHERE ${scope} AND t.deleted_at IS NULL
     GROUP BY t.status`,
    params
  );
  for (const row of result.rows) {
    stats[codeToStatus(row.status)] = row.count;
    stats.total += row.count;
  }
  return stats;
}

async function loadTicketRow(
  db: Pick<PoolClient, "query">,
  numericId: number,
  lock = false
): Promise<TicketRow | null> {
  const result = await db.query<TicketRow>(
    `${TICKET_SELECT} WHERE t.id = $1 AND t.deleted_at IS NULL ${lock ? "FOR UPDATE OF t" : ""}`,
    [numericId]
  );
  return result.rows[0] ?? null;
}

export async function getVisibleTicketRow(
  user: SessionUser,
  ticketId: string
): Promise<TicketRow> {
  const numericId = parseTicketId(ticketId);
  if (numericId === null) throw notFound("Ticket not found.");
  const row = await loadTicketRow(pool, numericId);
  if (!row || !canViewTicket(user, accessInfo(row))) {
    throw notFound("Ticket not found.");
  }
  return row;
}

export function ticketAccess(row: TicketRow): TicketAccessInfo {
  return accessInfo(row);
}

export async function getTicketDetail(
  user: SessionUser,
  ticketId: string
): Promise<TicketDetail> {
  const row = await getVisibleTicketRow(user, ticketId);
  return { ...toTicket(row), can: getTicketPermissions(user, accessInfo(row)) };
}

export async function logActivity(
  client: PoolClient,
  entry: {
    ticketId: number;
    userId: number;
    actionType: string;
    oldValue?: string | null;
    newValue?: string | null;
    description?: string | null;
  }
) {
  await client.query(
    `INSERT INTO ticket_activity_log
       (ticket_id, user_id, action_type, old_value, new_value, description)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      entry.ticketId,
      entry.userId,
      entry.actionType,
      entry.oldValue ?? null,
      entry.newValue ?? null,
      entry.description ?? null,
    ]
  );
}

async function logStatusChange(
  client: PoolClient,
  entry: {
    ticketId: number;
    oldStatus: TicketStatus | null;
    newStatus: TicketStatus;
    userId: number;
    reason?: string | null;
    note?: string | null;
  }
) {
  await client.query(
    `INSERT INTO ticket_status_history
       (ticket_id, old_status, new_status, changed_by, reason, note)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      entry.ticketId,
      entry.oldStatus === null ? null : statusToCode(entry.oldStatus),
      statusToCode(entry.newStatus),
      entry.userId,
      entry.reason ?? null,
      entry.note ?? null,
    ]
  );
}

export async function createTicket(
  _user: SessionUser,
  input: CreateTicketInput
): Promise<Ticket> {
  return withTransaction(async (client) => {
    const selectedProcess = await findActiveProcess(client, input.processId);
    if (!selectedProcess) {
      throw badRequest("Please select a valid process.", {
        processId: "Please select a valid process.",
      });
    }

    const manager = await findUserWithPermission(client, input.managerId, "ticket.assign");
    if (!manager) {
      throw badRequest("Please select a valid manager.", {
        managerId: "Please select a valid manager.",
      });
    }

    const creatorId = manager.id;

    const inserted = await client.query<{ id: number }>(
      `INSERT INTO tickets (title, description, priority, process_id, manager_id, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        input.title.trim(),
        input.description.trim(),
        input.priority,
        selectedProcess.id,
        manager.id,
        statusToCode("Open"),
        creatorId,
      ]
    );
    const ticketId = inserted.rows[0].id;

    await logStatusChange(client, {
      ticketId,
      oldStatus: null,
      newStatus: "Open",
      userId: creatorId,
    });
    await logActivity(client, {
      ticketId,
      userId: creatorId,
      actionType: "Ticket Created",
      oldValue: null,
      newValue: "Open",
      description: `Process: ${selectedProcess.name}. Priority: ${input.priority}. Assigning Manager: ${manager.name}`,
    });

    const row = await loadTicketRow(client, ticketId);
    return toTicket(row!);
  });
}

function requireReason(reason: string | undefined, label: string): string {
  const value = (reason ?? "").trim();
  if (value === "") throw badRequest(`${label} is required.`, { reason: `${label} is required.` });
  if (value.length > REASON_LIMIT)
    throw badRequest(`${label} is too long.`, {
      reason: `${label} must be at most ${REASON_LIMIT} characters.`,
    });
  return value;
}

function optionalNote(value: string | undefined): string | null {
  const text = (value ?? "").trim();
  if (text.length > REASON_LIMIT)
    throw badRequest("Note is too long.", {
      reason: `Note must be at most ${REASON_LIMIT} characters.`,
    });
  return text || null;
}

export async function performTicketAction(
  user: SessionUser,
  ticketId: string,
  input: TicketActionInput
): Promise<TicketDetail> {
  const numericId = parseTicketId(ticketId);
  if (numericId === null) throw notFound("Ticket not found.");

  return withTransaction(async (client) => {
    const row = await loadTicketRow(client, numericId, true);
    if (!row || !canViewTicket(user, accessInfo(row))) {
      throw notFound("Ticket not found.");
    }

    const can = getTicketPermissions(user, accessInfo(row));
    const oldStatus = codeToStatus(row.status);
    const notAllowed = () =>
      forbidden(
        `You cannot ${input.action} this ticket while it is "${oldStatus}".`
      );

    let newStatus: TicketStatus = oldStatus;
    let reason: string | null = null;
    let note: string | null = null;
    const sets: string[] = ["updated_at = NOW()"];
    const params: unknown[] = [];
    const addSet = (sql: string, value: unknown) => {
      params.push(value);
      sets.push(sql.replace("?", `$${params.length}`));
    };
    let activity: {
      actionType: string;
      oldValue: string | null;
      newValue: string | null;
      description: string | null;
    };

    switch (input.action) {
      case "assign": {
        if (!can.assign) throw notAllowed();
        const assigneeId = input.assigneeId;
        if (assigneeId === undefined || !Number.isInteger(assigneeId)) {
          throw badRequest("Please select a person to assign.", {
            assigneeId: "Please select a person to assign.",
          });
        }
        if (assigneeId === row.assigned_to) {
          throw badRequest("Ticket is already assigned to this person.", {
            assigneeId: "Ticket is already assigned to this person.",
          });
        }
        const assignee = await findUserWithPermission(client, assigneeId, "ticket.view_assigned");
        if (!assignee) {
          throw badRequest("This user cannot be assigned tickets.", {
            assigneeId: "This user cannot be assigned tickets.",
          });
        }
        note = optionalNote(input.reason);

        await client.query(
          `UPDATE ticket_assignments SET unassigned_at = NOW()
           WHERE ticket_id = $1 AND unassigned_at IS NULL`,
          [numericId]
        );
        await client.query(
          `INSERT INTO ticket_assignments
             (ticket_id, assigned_to, assigned_by, previous_assignee_id, assignment_note)
           VALUES ($1, $2, $3, $4, $5)`,
          [numericId, assigneeId, user.id, row.assigned_to, note]
        );

        addSet("assigned_to = ?", assigneeId);
        sets.push("assigned_at = NOW()");
        newStatus = "Assigned";
        const isReassign = row.assigned_to !== null;
        const details: string[] = [];
        if (oldStatus !== newStatus)
          details.push(`Status: ${oldStatus} → ${newStatus}`);
        if (note) details.push(`Note: ${note}`);
        activity = {
          actionType: isReassign ? "Ticket Reassigned" : "Ticket Assigned",
          oldValue: row.assigned_to_name ?? "Unassigned",
          newValue: assignee.name,
          description: details.length ? details.join(". ") : null,
        };
        break;
      }

      case "start": {
        if (!can.start) throw notAllowed();
        newStatus = "In Progress";
        note = optionalNote(input.reason);
        activity = {
          actionType: "Status Changed",
          oldValue: oldStatus,
          newValue: newStatus,
          description:
            oldStatus === "On Hold" ? "Work resumed" : "Work started",
        };
        break;
      }

      case "hold": {
        if (!can.hold) throw notAllowed();
        reason = requireReason(input.reason, "Hold reason");
        newStatus = "On Hold";
        activity = {
          actionType: "Ticket Put On Hold",
          oldValue: oldStatus,
          newValue: newStatus,
          description: reason,
        };
        break;
      }

      case "resolve": {
        if (!can.resolve) throw notAllowed();
        note = requireReason(input.reason, "Resolution note");
        newStatus = "Resolved";
        addSet("resolution_note = ?", note);
        sets.push("resolved_at = NOW()");
        activity = {
          actionType: "Ticket Resolved",
          oldValue: oldStatus,
          newValue: newStatus,
          description: note,
        };
        break;
      }

      case "close": {
        if (!can.close) throw notAllowed();
        reason = can.closeNeedsReason
          ? requireReason(input.reason, "Close reason")
          : optionalNote(input.reason);
        newStatus = "Closed";
        sets.push("closed_at = NOW()");
        activity = {
          actionType: "Ticket Closed",
          oldValue: oldStatus,
          newValue: newStatus,
          description:
            reason ?? "Creator confirmed the issue is resolved",
        };
        break;
      }

      case "unassign": {
        if (!can.unassign) throw notAllowed();
        note = optionalNote(input.reason);

        await client.query(
          `UPDATE ticket_assignments SET unassigned_at = NOW()
           WHERE ticket_id = $1 AND unassigned_at IS NULL`,
          [numericId]
        );
        sets.push("assigned_to = NULL", "assigned_at = NULL");

        if (oldStatus !== "Reopened") newStatus = "Open";

        const details: string[] = [];
        if (oldStatus !== newStatus) details.push(`Status: ${oldStatus} → ${newStatus}`);
        if (note) details.push(`Note: ${note}`);
        activity = {
          actionType: "Ticket Unassigned",
          oldValue: row.assigned_to_name ?? "Unassigned",
          newValue: "Unassigned",
          description: details.length ? details.join(". ") : null,
        };
        break;
      }

      case "reopen": {
        if (!can.reopen) throw notAllowed();
        reason = requireReason(input.reason, "Reopen reason");
        newStatus = "Reopened";
        sets.push("reopened_at = NOW()", "closed_at = NULL", "resolved_at = NULL");
        activity = {
          actionType: "Ticket Reopened",
          oldValue: oldStatus,
          newValue: newStatus,
          description: reason,
        };
        break;
      }

      default:
        throw badRequest("Unknown action.");
    }

    if (newStatus !== oldStatus) {
      addSet("status = ?", statusToCode(newStatus));
      await logStatusChange(client, {
        ticketId: numericId,
        oldStatus,
        newStatus,
        userId: user.id,
        reason,
        note,
      });
    }

    params.push(numericId);
    await client.query(
      `UPDATE tickets SET ${sets.join(", ")} WHERE id = $${params.length}`,
      params
    );

    await logActivity(client, { ticketId: numericId, userId: user.id, ...activity });

    const updated = await loadTicketRow(client, numericId);
    if (!updated) throw new HttpError(500, "Ticket disappeared.");
    return {
      ...toTicket(updated),
      can: getTicketPermissions(user, accessInfo(updated)),
    };
  });
}

export async function deleteTicket(user: SessionUser, ticketId: string): Promise<void> {
  if (!hasPermission(user, "ticket.delete")) throw forbidden();
  const numericId = parseTicketId(ticketId);
  if (numericId === null) throw notFound("Ticket not found.");

  await withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE tickets SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL`,
      [numericId, user.id]
    );
    if (result.rowCount === 0) throw notFound("Ticket not found.");
    await client.query(
      `UPDATE ticket_assignments SET unassigned_at = NOW()
       WHERE ticket_id = $1 AND unassigned_at IS NULL`,
      [numericId]
    );
  });
}
