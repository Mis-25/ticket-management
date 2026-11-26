import { PoolClient } from "pg";
import { pool, withTransaction } from "@/lib/db";
import { badRequest, HttpError, notFound } from "@/lib/httpError";
import { hashPassword } from "@/lib/password";
import {
  CreateUserInput,
  RoleId,
  ROLES,
  SessionUser,
  UpdateUserInput,
  User,
  UserStatus,
} from "@/types/user";
import { statusToCode } from "@/types/ticket";

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

export async function listUsers(): Promise<User[]> {
  const result = await pool.query<UserRow>(
    `${USER_SELECT} WHERE u.status <> 'deleted' ORDER BY u.created_at DESC, u.id DESC`
  );
  return result.rows.map(toUser);
}

export interface UserOption {
  id: number;
  name: string;
  roleName: string;
}

export async function listUsersWithPermission(code: string): Promise<UserOption[]> {
  const result = await pool.query<{ id: number; name: string; role_name: string }>(
    `SELECT u.id, u.name, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.status = 'active'
       AND EXISTS (
         SELECT 1 FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = u.role_id AND p.code = $1
       )
     ORDER BY u.name ASC`,
    [code]
  );
  return result.rows.map((r) => ({ id: r.id, name: r.name, roleName: r.role_name }));
}

export async function findUserWithPermission(
  db: Pick<PoolClient, "query">,
  userId: number,
  code: string
): Promise<UserOption | null> {
  const result = await db.query<{ id: number; name: string; role_name: string }>(
    `SELECT u.id, u.name, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1 AND u.status = 'active'
       AND EXISTS (
         SELECT 1 FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = u.role_id AND p.code = $2
       )`,
    [userId, code]
  );
  const r = result.rows[0];
  return r ? { id: r.id, name: r.name, roleName: r.role_name } : null;
}

const isForeignKeyViolation = (error: unknown) =>
  (error as { code?: string }).code === "23503";

const unknownRole = () =>
  badRequest("Please select a valid role.", { roleId: "Please select a valid role." });

async function assertRoleExists(roleId: number) {
  const role = await pool.query(
    "SELECT 1 FROM roles WHERE id = $1 AND deleted_at IS NULL",
    [roleId]
  );
  if (!role.rowCount) throw unknownRole();
}

async function getUser(id: number): Promise<User> {
  const result = await pool.query<UserRow>(`${USER_SELECT} WHERE u.id = $1 AND u.status <> 'deleted'`, [id]);
  if (!result.rows[0]) throw notFound("User not found.");
  return toUser(result.rows[0]);
}

export async function createUser(input: CreateUserInput): Promise<User> {
  await assertRoleExists(input.roleId);
  const passwordHash = await hashPassword(input.password);
  try {
    const result = await pool.query<{ id: number }>(
      `INSERT INTO users (name, email, phone_number, role_id, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name,
             phone_number = EXCLUDED.phone_number,
             role_id = EXCLUDED.role_id,
             password_hash = EXCLUDED.password_hash,
             status = 'active',
             created_at = NOW(),
             updated_at = NOW()
         WHERE users.status = 'deleted'
       RETURNING id`,
      [
        input.name.trim(),
        input.email.trim().toLowerCase(),
        input.phoneNumber.trim(),
        input.roleId,
        passwordHash,
      ]
    );
    if (!result.rows[0]) throw duplicateEmail();
    return getUser(result.rows[0].id);
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicateEmail();
    if (isForeignKeyViolation(error)) throw unknownRole();
    throw error;
  }
}

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
  const passwordChanged = !!input.password;
  if (input.password) add("password_hash", await hashPassword(input.password));

  if (input.roleId !== undefined) await assertRoleExists(input.roleId);

  await withTransaction(async (client) => {
    params.push(id);
    const result = await client.query(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${params.length} AND status <> 'deleted'`,
      params
    );
    if (result.rowCount === 0) throw notFound("User not found.");

    if (input.status === "inactive" || (passwordChanged && id !== admin.id)) {
      await client.query("DELETE FROM user_sessions WHERE user_id = $1", [id]);
    }
  });
  return getUser(id);
}

export async function deleteUser(admin: SessionUser, id: number): Promise<void> {
  if (id === admin.id) throw badRequest("You cannot delete your own account.");

  await withTransaction(async (client) => {
    const user = await client.query(
      `SELECT 1 FROM users WHERE id = $1 AND status <> 'deleted' FOR UPDATE`,
      [id]
    );
    if (!user.rowCount) throw notFound("User not found.");

    const openTickets = await client.query<{ ticket_number: string }>(
      `SELECT ticket_number FROM tickets
       WHERE assigned_to = $1 AND deleted_at IS NULL AND status <> $2
       ORDER BY id`,
      [id, statusToCode("Closed")]
    );
    if (openTickets.rowCount) {
      const list = openTickets.rows.map((r) => r.ticket_number).join(", ");
      throw badRequest(
        `This user still has open tickets (${list}). Please reassign them first.`
      );
    }

    const managed = await client.query<{ ticket_number: string }>(
      `SELECT ticket_number FROM tickets
       WHERE manager_id = $1 AND deleted_at IS NULL AND status <> $2
       ORDER BY id`,
      [id, statusToCode("Closed")]
    );
    if (managed.rowCount) {
      const list = managed.rows.map((r) => r.ticket_number).join(", ");
      throw badRequest(
        `This user is the assigning manager of open tickets (${list}). Please close or delete them first.`
      );
    }

    await client.query(
      `UPDATE users SET status = 'deleted', updated_at = NOW() WHERE id = $1`,
      [id]
    );
    await client.query("DELETE FROM user_sessions WHERE user_id = $1", [id]);
  });
}

const ADMIN_WITH_LOGIN = `SELECT 1 FROM users
  WHERE role_id = $1 AND status = 'active' AND password_hash IS NOT NULL LIMIT 1`;

export async function isSetupNeeded(): Promise<boolean> {
  const result = await pool.query(
    ADMIN_WITH_LOGIN,
    [ROLES.ADMIN]
  );
  return result.rowCount === 0;
}

export async function createFirstAdmin(input: CreateUserInput): Promise<{ id: number }> {
  const passwordHash = await hashPassword(input.password);
  return withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(424242)");
    const existingAdmin = await client.query(ADMIN_WITH_LOGIN, [ROLES.ADMIN]);
    if (existingAdmin.rowCount) {
      throw new HttpError(409, "An Admin already exists.");
    }

    const result = await client.query<{ id: number }>(
      `INSERT INTO users (name, email, phone_number, role_id, status, password_hash)
       VALUES ($1, $2, $3, $4, 'active', $5)
       ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name,
             phone_number = EXCLUDED.phone_number,
             role_id = EXCLUDED.role_id,
             status = 'active',
             password_hash = EXCLUDED.password_hash,
             updated_at = NOW()
       RETURNING id`,
      [
        input.name.trim(),
        input.email.trim().toLowerCase(),
        input.phoneNumber.trim(),
        ROLES.ADMIN,
        passwordHash,
      ]
    );
    return result.rows[0];
  });
}

export async function findLoginUser(
  email: string
): Promise<{ id: number; passwordHash: string | null } | null> {
  const result = await pool.query<{ id: number; password_hash: string | null }>(
    `SELECT id, password_hash FROM users WHERE email = $1 AND status = 'active'`,
    [email.trim().toLowerCase()]
  );
  const row = result.rows[0];
  return row ? { id: row.id, passwordHash: row.password_hash } : null;
}
