import { Pool } from "pg";

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