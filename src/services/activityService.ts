import { pool } from "@/lib/db";
import { forbidden } from "@/lib/httpError";
import { canSeeInternal, getTicketPermissions } from "@/lib/ticketRules";
import { getVisibleTicketRow, ticketAccess } from "@/services/ticketService";
import { ActivityEntry } from "@/types/ticket";
import { SessionUser } from "@/types/user";

interface ActivityRow {
  id: number;
  action_type: string;
  old_value: string | null;
  new_value: string | null;
  description: string | null;
  created_at: Date;
  user_id: number;
  user_name: string;
}

export async function listActivity(
  user: SessionUser,
  ticketId: string
): Promise<ActivityEntry[]> {
  const ticket = await getVisibleTicketRow(user, ticketId);
  const access = ticketAccess(ticket);
  if (!getTicketPermissions(user, access).viewHistory) throw forbidden();
  const showInternal = canSeeInternal(user, access);

  const result = await pool.query<ActivityRow>(
    `SELECT a.id, a.action_type, a.old_value, a.new_value, a.description,
            a.created_at, u.id AS user_id, u.name AS user_name
     FROM ticket_activity_log a
     JOIN users u ON u.id = a.user_id
     WHERE a.ticket_id = $1
       ${showInternal ? "" : "AND a.action_type <> 'Internal Note Added'"}
     ORDER BY a.created_at ASC, a.id ASC`,
    [ticket.id]
  );

  return result.rows.map((row) => ({
    id: row.id,
    actionType: row.action_type,
    oldValue: row.old_value,
    newValue: row.new_value,
    description: row.description,
    createdAt: row.created_at.toISOString(),
    user: { id: row.user_id, name: row.user_name },
  }));
}
