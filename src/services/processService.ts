import { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { Process } from "@/types/ticket";

/** Dropdown ke liye active processes, company ke order me. */
export async function listActiveProcesses(): Promise<Process[]> {
  const result = await pool.query<Process>(
    `SELECT id, name FROM processes
     WHERE is_active
     ORDER BY sort_order, name`
  );
  return result.rows;
}

/** Process id sahi + active hai? Ho to { id, name }, warna null. */
export async function findActiveProcess(
  db: Pick<PoolClient, "query">,
  id: number
): Promise<Process | null> {
  const result = await db.query<Process>(
    `SELECT id, name FROM processes WHERE id = $1 AND is_active`,
    [id]
  );
  return result.rows[0] ?? null;
}
