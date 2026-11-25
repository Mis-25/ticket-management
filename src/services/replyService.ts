import { pool, withTransaction } from "@/lib/db";
import { forbidden } from "@/lib/httpError";
import { canSeeInternal, getTicketPermissions } from "@/lib/ticketRules";
import {
  getVisibleTicketRow,
  logActivity,
  ticketAccess,
} from "@/services/ticketService";
import { CommentType, CreateReplyInput, TicketReply } from "@/types/reply";
import { SessionUser } from "@/types/user";

interface ReplyRow {
  id: number;
  ticket_number: string;
  message: string;
  comment_type: CommentType;
  created_at: Date;
  user_id: number;
  user_name: string;
  role_name: string;
}

const REPLY_SELECT = `
  SELECT r.id, t.ticket_number, r.message, r.comment_type, r.created_at,
         u.id AS user_id, u.name AS user_name, ro.name AS role_name
  FROM ticket_replies r
  JOIN tickets t ON t.id = r.ticket_id
  JOIN users u ON u.id = r.user_id
  JOIN roles ro ON ro.id = u.role_id`;

function toReply(row: ReplyRow): TicketReply {
  return {
    id: row.id,
    ticketId: row.ticket_number,
    message: row.message,
    commentType: row.comment_type,
    createdAt: row.created_at.toISOString(),
    user: { id: row.user_id, name: row.user_name, roleName: row.role_name },
  };
}

export async function listReplies(
  user: SessionUser,
  ticketId: string
): Promise<TicketReply[]> {
  const ticket = await getVisibleTicketRow(user, ticketId);
  const showInternal = canSeeInternal(user, ticketAccess(ticket));

  const result = await pool.query<ReplyRow>(
    `${REPLY_SELECT}
     WHERE r.ticket_id = $1
       ${showInternal ? "" : "AND r.comment_type = 'public'"}
     ORDER BY r.created_at ASC, r.id ASC`,
    [ticket.id]
  );
  return result.rows.map(toReply);
}

export async function createReply(
  user: SessionUser,
  ticketId: string,
  input: CreateReplyInput
): Promise<TicketReply> {
  const ticket = await getVisibleTicketRow(user, ticketId);
  const can = getTicketPermissions(user, ticketAccess(ticket));

  if (input.commentType === "internal" && !can.internalNote) {
    throw forbidden("You cannot add internal notes on this ticket.");
  }
  if (input.commentType === "public" && !can.reply) {
    throw forbidden(
      ticket.status === 5
        ? "This ticket is closed. Reopen it to reply."
        : "You cannot reply to this ticket."
    );
  }

  return withTransaction(async (client) => {
    const locked = await client.query<{ status: number }>(
      "SELECT status FROM tickets WHERE id = $1 FOR UPDATE",
      [ticket.id]
    );
    if (input.commentType === "public" && locked.rows[0]?.status === 5) {
      throw forbidden("This ticket is closed. Reopen it to reply.");
    }

    const inserted = await client.query<{ id: number }>(
      `INSERT INTO ticket_replies (ticket_id, user_id, message, comment_type)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [ticket.id, user.id, input.message.trim(), input.commentType]
    );

    await logActivity(client, {
      ticketId: ticket.id,
      userId: user.id,
      actionType:
        input.commentType === "internal" ? "Internal Note Added" : "Comment Added",
    });
    await client.query("UPDATE tickets SET updated_at = NOW() WHERE id = $1", [
      ticket.id,
    ]);

    const saved = await client.query<ReplyRow>(`${REPLY_SELECT} WHERE r.id = $1`, [
      inserted.rows[0].id,
    ]);
    return toReply(saved.rows[0]);
  });
}
