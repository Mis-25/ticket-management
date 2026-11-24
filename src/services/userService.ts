import { pool, withTransaction } from "@/lib/db";
import { badRequest, HttpError, notFound } from "@/lib/httpError";
import {
  CreateUserInput,
  RoleId,
  ROLES,
  SessionUser,
  UpdateUserInput,
  User,
  UserStatus,
} from "@/types/user";

interface UserRow {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  role_id: RoleId;
  role_name: string;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
  reply_count: number;
}

const USER_SELECT = `
  SELECT u.id, u.name, u.email, u.phone_number, u.role_id, r.name AS role_name,
         u.status, u.created_at, u.updated_at,
         (SELECT COUNT(*)::int FROM ticket_replies tr WHERE tr.user_id = u.id) AS reply_count
  FROM users u
  JOIN roles r ON r.id = u.role_id`;

function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phoneNumber: row.phone_number,
    roleId: row.role_id,
    roleName: row.role_name,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    replyCount: Number(row.reply_count),
  };
}

const duplicateEmail = () =>
  new HttpError(409, "A user with this email already exists", {
    email: "A user with this email already exists",
  });

const isUniqueViolation = (error: unknown) =>
  (error as { code?: string }).code === "23505";

/** Saare users (newest first). */
export async function listUsers(): Promise<User[]> {
  const result = await pool.query<UserRow>(
    `${USER_SELECT} ORDER BY u.created_at DESC, u.id DESC`
  );
  return result.rows.map(toUser);
}

/** Assign dropdown ke liye: active Support Agents. */
export async function listSupportAgents(): Promise<{ id: number; name: string }[]> {
  const result = await pool.query<{ id: number; name: string }>(
    `SELECT id, name FROM users
     WHERE role_id = $1 AND status = 'active'
     ORDER BY name ASC`,
    [ROLES.SUPPORT_AGENT]
  );
  return result.rows;
}

async function getUser(id: number): Promise<User> {
  const result = await pool.query<UserRow>(`${USER_SELECT} WHERE u.id = $1`, [id]);
  if (!result.rows[0]) throw notFound("User not found.");
  return toUser(result.rows[0]);
}

/** Naya user (Admin banata hai). */
export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    const result = await pool.query<{ id: number }>(
      `INSERT INTO users (name, email, phone_number, role_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        input.name.trim(),
        input.email.trim().toLowerCase(),
        input.phoneNumber.trim(),
        input.roleId,
      ]
    );
    return getUser(result.rows[0].id);
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicateEmail();
    throw error;
  }
}

/**
 * User update (Admin). Admin khud ka role/status nahi badal sakta
 * (warna system bina Admin ke reh sakta hai).
 * User inactive ho to uske saare sessions khatam.
 */
export async function updateUser(
  admin: SessionUser,
  id: number,
  input: UpdateUserInput
): Promise<User> {
  if (id === admin.id) {
    if (input.roleId !== undefined && input.roleId !== ROLES.ADMIN)
      throw badRequest("You cannot change your own role.", {
        roleId: "You cannot change your own role.",
      });
    if (input.status === "inactive")
      throw badRequest("You cannot deactivate your own account.");
  }

  const sets: string[] = ["updated_at = NOW()"];
  const params: unknown[] = [];
  const add = (column: string, value: unknown) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };

  if (input.name !== undefined) add("name", input.name.trim());
  if (input.phoneNumber !== undefined) add("phone_number", input.phoneNumber.trim());
  if (input.roleId !== undefined) add("role_id", input.roleId);
  if (input.status !== undefined) add("status", input.status);

  await withTransaction(async (client) => {
    params.push(id);
    const result = await client.query(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${params.length}`,
      params
    );
    if (result.rowCount === 0) throw notFound("User not found.");

    if (input.status === "inactive") {
      await client.query("DELETE FROM user_sessions WHERE user_id = $1", [id]);
    }
  });
  return getUser(id);
}

// ---------- Pehli baar setup (pehla Admin) ----------

export async function isSetupNeeded(): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM users WHERE role_id = $1 AND status = 'active' LIMIT 1`,
    [ROLES.ADMIN]
  );
  return result.rowCount === 0;
}

/**
 * Pehla Admin banata hai — sirf tab jab koi active Admin nahi hai.
 * Email pehle se users table me ho to wahi user Admin ban jata hai
 * (naya duplicate user nahi banta).
 */
export async function createFirstAdmin(input: CreateUserInput): Promise<{ id: number }> {
  return withTransaction(async (client) => {
    // Do log ek saath setup na kar sakein
    await client.query("SELECT pg_advisory_xact_lock(424242)");
    const existingAdmin = await client.query(
      `SELECT 1 FROM users WHERE role_id = $1 AND status = 'active' LIMIT 1`,
      [ROLES.ADMIN]
    );
    if (existingAdmin.rowCount) {
      throw new HttpError(409, "An Admin already exists.");
    }

    const result = await client.query<{ id: number }>(
      `INSERT INTO users (name, email, phone_number, role_id, status)
       VALUES ($1, $2, $3, $4, 'active')
       ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name,
             phone_number = EXCLUDED.phone_number,
             role_id = EXCLUDED.role_id,
             status = 'active',
             updated_at = NOW()
       RETURNING id`,
      [
        input.name.trim(),
        input.email.trim().toLowerCase(),
        input.phoneNumber.trim(),
        ROLES.ADMIN,
      ]
    );
    return result.rows[0];
  });
}
