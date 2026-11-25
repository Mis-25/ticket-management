import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { asText, badRequest, errorResponse, notFound, readJson } from "@/lib/httpError";
import { deleteRole, updateRole } from "@/services/roleService";
import { RoleInput, validateRole } from "@/types/role";

type Params = { params: Promise<{ id: string }> };

async function roleId(params: Params["params"]): Promise<number> {
  const { id } = await params;
  if (!/^\d+$/.test(id)) throw notFound("Role not found.");
  return Number(id);
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requirePermission("user.manage");
    const id = await roleId(params);
    const body = await readJson(request);

    const input: RoleInput = {};
    if ("name" in body) input.name = asText(body.name).trim();
    if ("description" in body) input.description = asText(body.description).trim();
    if ("permissions" in body) {
      if (!Array.isArray(body.permissions)) throw badRequest("Invalid permissions.");
      input.permissions = body.permissions.filter((v): v is string => typeof v === "string");
    }
    const errors = validateRole(input);
    if (Object.keys(errors).length > 0) {
      throw badRequest("Please fix the highlighted fields", errors);
    }
    return NextResponse.json(await updateRole(id, input));
  } catch (error) {
    return errorResponse(error, "PATCH /api/roles/[id]");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requirePermission("user.manage");
    await deleteRole(await roleId(params));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "DELETE /api/roles/[id]");
  }
}
