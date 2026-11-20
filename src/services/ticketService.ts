import { pool } from "@/lib/db";
import { CreateTicketInput, Ticket, TicketStatus } from "@/types/ticket";


const ID_PREFIX = "TKT-";
const COLUMNS = "id, title, description, status, created_at";

interface TicketRow {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  created_at: Date;
}

function toTicket(row: TicketRow): Ticket {
  return {
    id: `${ID_PREFIX}${row.id}`,
    title: row.title,
    description: row.description,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}


export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const result = await pool.query<TicketRow>(
    `INSERT INTO tickets (title, description, status)
     VALUES ($1, $2, 'Open')
     RETURNING ${COLUMNS}`,
    [input.title.trim(), input.description.trim()]
  );
  return toTicket(result.rows[0]);
}

/**
 * Saare tickets return karta hai, newest first.
 */
export async function listTickets(): Promise<Ticket[]> {
  const result = await pool.query<TicketRow>(
    `SELECT ${COLUMNS} FROM tickets ORDER BY created_at DESC, id DESC`
  );
  return result.rows.map(toTicket);
}

/**
 * Ticket ko "Closed" karta hai. Ticket na mile to null return hota hai.
 */
export async function closeTicket(id: string): Promise<Ticket | null> {
  const numericId = parseInt(id.replace(ID_PREFIX, ""), 10);
  if (Number.isNaN(numericId)) return null;

  const result = await pool.query<TicketRow>(
    `UPDATE tickets SET status = 'Closed'
     WHERE id = $1
     RETURNING ${COLUMNS}`,
    [numericId]
  );
  return result.rows[0] ? toTicket(result.rows[0]) : null;
}