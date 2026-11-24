import { Pool, PoolClient } from "pg";

/**
 * PostgreSQL connection pool.
 * Dev mode mein hot reload ke time baar-baar naya connection na bane,
 * isliye pool ko globalThis mein save karte hain.
 */
const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool: Pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}

/**
 * Kai queries ko ek transaction me chalata hai (BEGIN ... COMMIT).
 * Koi bhi query fail ho to ROLLBACK — aadha-adhoora data save nahi hota.
 */
export async function withTransaction<T>(
  work: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
