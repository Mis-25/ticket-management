import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { pool } from "@/lib/db";
import { forbidden, unauthorized } from "@/lib/httpError";
import { RoleId, SessionUser } from "@/types/user";

const SESSION_COOKIE = "hd_session";
const SESSION_DAYS = 7;

interface CurrentUserRow {
  id: number;
  name: string;
  email: string;
  role_id: RoleId;
  role_name: string;
  permissions: string[] | null;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const result = await pool.query<CurrentUserRow>(
    `SELECT u.id, u.name, u.email, u.role_id, r.name AS role_name,
            ARRAY(
              SELECT p.code FROM role_permissions rp
              JOIN permissions p ON p.id = rp.permission_id
              WHERE rp.role_id = u.role_id
            ) AS permissions
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     JOIN roles r ON r.id = u.role_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.status = 'active'`,
    [hashToken(token)]
  );

  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    roleId: row.role_id,
    roleName: row.role_name,
    permissions: row.permissions ?? [],
  };
}

export async function startSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await pool.query("DELETE FROM user_sessions WHERE expires_at <= NOW()");
  await pool.query(
    `INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, hashToken(token), expires]
  );
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await pool.query("DELETE FROM user_sessions WHERE token_hash = $1", [hashToken(token)]);
  }
  store.delete(SESSION_COOKIE);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}

export function hasPermission(user: SessionUser, permission: string): boolean {
  return user.permissions.includes(permission);
}

export async function requirePermission(permission: string): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasPermission(user, permission)) throw forbidden();
  return user;
}
