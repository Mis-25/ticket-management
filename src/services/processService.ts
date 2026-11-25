import { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { badRequest, notFound } from "@/lib/httpError";
import { Process, ProcessInput, ProcessRow } from "@/types/ticket";

export async function listActiveProcesses(): Promise<Process[]> {
  const result = await pool.query<Process>(
    `SELECT id, name FROM processes
     WHERE is_active AND deleted_at IS NULL
     ORDER BY sort_order, name`
  );
  return result.rows;
}

export async function findActiveProcess(
  db: Pick<PoolClient, "query">,
  id: number
): Promise<Process | null> {
  const result = await db.query<Process>(
    `SELECT id, name FROM processes WHERE id = $1 AND is_active AND deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] ?? null;
}


interface ProcessDbRow {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  ticket_count: string;
  created_at: Date;
}

const toProcessRow = (row: ProcessDbRow): ProcessRow => ({
  id: row.id,
  name: row.name,
  sortOrder: row.sort_order,
  isActive: row.is_active,
  ticketCount: Number(row.ticket_count),
  createdAt: row.created_at.toISOString(),
});

const SELECT_PROCESS_ROW = `
  SELECT pr.id, pr.name, pr.sort_order, pr.is_active, pr.created_at,
         (SELECT COUNT(*) FROM tickets t WHERE t.process_id = pr.id AND t.deleted_at IS NULL) AS ticket_count
  FROM processes pr`;

export async function listAllProcesses(): Promise<ProcessRow[]> {
  const result = await pool.query<ProcessDbRow>(
    `${SELECT_PROCESS_ROW} WHERE pr.deleted_at IS NULL ORDER BY pr.sort_order, pr.name`
  );
  return result.rows.map(toProcessRow);
}

async function getProcessRow(id: number): Promise<ProcessRow> {
  const result = await pool.query<ProcessDbRow>(
    `${SELECT_PROCESS_ROW} WHERE pr.id = $1 AND pr.deleted_at IS NULL`,
    [id]
  );
  if (!result.rows[0]) throw notFound("Process not found.");
  return toProcessRow(result.rows[0]);
}

async function assertNameFree(name: string, exceptId?: number) {
  const result = await pool.query(
    `SELECT 1 FROM processes
     WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL
       AND id <> COALESCE($2::int, -1)`,
    [name, exceptId ?? null]
  );
  if (result.rowCount) {
    throw badRequest("This process already exists.", { name: "This process already exists." });
  }
}

export async function createProcess(name: string, sortOrder?: number): Promise<ProcessRow> {
  await assertNameFree(name);
  const result = await pool.query<{ id: number }>(
    `INSERT INTO processes (name, sort_order)
     VALUES ($1, COALESCE($2::smallint,
                          (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM processes)::smallint))
     RETURNING id`,
    [name, sortOrder ?? null]
  );
  return getProcessRow(result.rows[0].id);
}

export async function updateProcess(id: number, input: ProcessInput): Promise<ProcessRow> {
  await getProcessRow(id);
  if (input.name !== undefined) await assertNameFree(input.name, id);
  await pool.query(
    `UPDATE processes SET
       name       = COALESCE($2, name),
       sort_order = COALESCE($3::smallint, sort_order),
       is_active  = COALESCE($4::boolean, is_active)
     WHERE id = $1`,
    [id, input.name ?? null, input.sortOrder ?? null, input.isActive ?? null]
  );
  return getProcessRow(id);
}

export async function deleteProcess(id: number): Promise<void> {
  const result = await pool.query(
    `UPDATE processes SET deleted_at = NOW(), is_active = FALSE
     WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  if (result.rowCount === 0) throw notFound("Process not found.");
}
