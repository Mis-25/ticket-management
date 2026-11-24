import { pool } from "@/lib/db";
import { forbidden, unauthorized } from "@/lib/httpError";
import { RoleId, SessionUser } from "@/types/user";
import { ROLES } from "@/types/user";

/**
 * Current user (koi login / user-select nahi):
 *  - App hamesha Admin ke roop me chalti hai — sabse pehla active Admin.
 *  - Role + permissions har request par database se nikale jaate hain.
 *  - Koi Admin na ho to null → frontend /setup par "Create Admin" form dikhata hai.
 */

interface CurrentUserRow {
  id: number;
  name: string;
  email: string;
  role_id: RoleId;
  role_name: string;
  permissions: string[] | null;
}

/** App chalane wala Admin. Koi active Admin nahi hai to null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const result = await pool.query<CurrentUserRow>(
    `SELECT u.id, u.name, u.email, u.role_id, r.name AS role_name,
            ARRAY(
              SELECT p.code FROM role_permissions rp
              JOIN permissions p ON p.id = rp.permission_id
              WHERE rp.role_id = u.role_id
            ) AS permissions
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.role_id = $1 AND u.status = 'active'
     ORDER BY u.id
     LIMIT 1`,
    [ROLES.ADMIN]
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

/** Admin bana hona zaroori hai — nahi to 401 (pehle setup karo). */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}

export function hasPermission(user: SessionUser, permission: string): boolean {
  return user.permissions.includes(permission);
}

/** User + permission dono zaroori — nahi to 401 / 403. */
export async function requirePermission(permission: string): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasPermission(user, permission)) throw forbidden();
  return user;
}
