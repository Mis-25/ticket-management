import { PoolClient } from "pg";
import { pool, withTransaction } from "@/lib/db";
import { badRequest, notFound } from "@/lib/httpError";
import { Permission, Role, RoleInput } from "@/types/role";

interface RoleRow {
  id: number;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: string[] | null;
  user_count: number;
}

const ROLE_SELECT = `
  SELECT r.id, r.name, r.description, r.is_system,
         ARRAY(
           SELECT p.code FROM role_permissions rp
           JOIN permissions p ON p.id = rp.permission_id
           WHERE rp.role_id = r.id ORDER BY p.id
         ) AS permissions,
         (SELECT COUNT(*)::int FROM users u
          WHERE u.role_id = r.id AND u.status <> 'deleted') AS user_count
  FROM roles r`;

const toRole = (row: RoleRow): Role => ({
  id: row.id,
  name: row.name,
  description: row.description ?? "",
  isSystem: row.is_system,
  permissions: row.permissions ?? [],
  userCount: Number(row.user_count),
});

export async function listRoles(): Promise<Role[]> {
  const result = await pool.query<RoleRow>(
    `${ROLE_SELECT} WHERE r.deleted_at IS NULL ORDER BY r.is_system DESC, r.id`
  );
  return result.rows.map(toRole);
}

export async function listPermissions(): Promise<Permission[]> {
  const result = await pool.query<{ code: string; description: string; recommended_for: string[] }>(
    "SELECT code, description, recommended_for FROM permissions ORDER BY id"
  );
  return result.rows.map((r) => ({
    code: r.code,
    description: r.description,
    recommendedFor: r.recommended_for ?? [],
  }));
}

async function getRole(db: Pick<PoolClient, "query">, id: number): Promise<Role> {
  const result = await db.query<RoleRow>(
    `${ROLE_SELECT} WHERE r.id = $1 AND r.deleted_at IS NULL`,
    [id]
  );
  if (!result.rows[0]) throw notFound("Role not found.");
  return toRole(result.rows[0]);
}

async function assertNameFree(db: PoolClient, name: string, exceptId?: number) {
  const result = await db.query(
    `SELECT 1 FROM roles
     WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL
       AND id <> COALESCE($2::smallint, -1)`,
    [name, exceptId ?? null]
  );
  if (result.rowCount) {
    throw badRequest("This role already exists.", { name: "This role already exists." });
  }
}

async function setPermissions(db: PoolClient, roleId: number, codes: string[]) {
  const unique = [...new Set(codes)];
  const found = await db.query<{ id: number }>(
    "SELECT id FROM permissions WHERE code = ANY($1::text[])",
    [unique]
  );
  if (found.rowCount !== unique.length) {
    throw badRequest("Unknown permission selected.", { permissions: "Unknown permission selected." });
  }
  await db.query("DELETE FROM role_permissions WHERE role_id = $1", [roleId]);
  await db.query(
    `INSERT INTO role_permissions (role_id, permission_id)
     SELECT $1, UNNEST($2::int[])`,
    [roleId, found.rows.map((r) => r.id)]
  );
}

export async function createRole(input: Required<RoleInput>): Promise<Role> {
  return withTransaction(async (client) => {
    await client.query("LOCK TABLE roles IN SHARE ROW EXCLUSIVE MODE");
    await assertNameFree(client, input.name);
    const inserted = await client.query<{ id: number }>(
      `INSERT INTO roles (id, name, description)
       VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM roles), $1, $2)
       RETURNING id`,
      [input.name, input.description || null]
    );
    const id = inserted.rows[0].id;
    await setPermissions(client, id, input.permissions);
    return getRole(client, id);
  });
}

export async function updateRole(id: number, input: RoleInput): Promise<Role> {
  return withTransaction(async (client) => {
    const role = await getRole(client, id);
    if (role.isSystem && (input.name !== undefined || input.permissions !== undefined)) {
      throw badRequest("The Admin role's name and permissions are fixed.");
    }
    if (input.name !== undefined) await assertNameFree(client, input.name, id);

    await client.query(
      `UPDATE roles SET
         name        = COALESCE($2, name),
         description = COALESCE($3, description)
       WHERE id = $1`,
      [id, input.name ?? null, input.description ?? null]
    );
    if (input.permissions !== undefined) await setPermissions(client, id, input.permissions);
    return getRole(client, id);
  });
}

export async function deleteRole(id: number): Promise<void> {
  await withTransaction(async (client) => {
    const role = await getRole(client, id);
    if (role.isSystem) throw badRequest("The Admin role cannot be deleted.");
    const used = await client.query<{ name: string }>(
      `SELECT name FROM users WHERE role_id = $1 AND status <> 'deleted' ORDER BY name LIMIT 5`,
      [id]
    );
    if (used.rowCount) {
      const names = used.rows.map((u) => u.name).join(", ");
      throw badRequest(
        `This role is still given to users (${names}). Change their role or delete them first.`
      );
    }
    await client.query("UPDATE roles SET deleted_at = NOW() WHERE id = $1", [id]);
  });
}
