import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { asText, badRequest, errorResponse, notFound, readJson } from "@/lib/httpError";
import { deleteUser, updateUser } from "@/services/userService";
import { RoleId, UpdateUserInput, validateUserUpdate } from "@/types/user";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requirePermission("user.manage");
    const { id } = await params;
    if (!/^\d+$/.test(id)) throw notFound("User not found.");
    const body = await readJson(request);

    const input: UpdateUserInput = {};
    if ("name" in body) input.name = asText(body.name);
    if ("phoneNumber" in body) input.phoneNumber = asText(body.phoneNumber);
    if ("roleId" in body) input.roleId = body.roleId as RoleId;
    if ("password" in body) input.password = asText(body.password);
    if ("status" in body) {
      if (body.status !== "active" && body.status !== "inactive")
        throw badRequest("Invalid status.");
      input.status = body.status;
    }

    const errors = validateUserUpdate(input);
    if (Object.keys(errors).length > 0) {
      throw badRequest("Please fix the highlighted fields", errors);
    }

    return NextResponse.json(await updateUser(admin, Number(id), input));
  } catch (error) {
    return errorResponse(error, "PATCH /api/users/[id]");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requirePermission("user.manage");
    const { id } = await params;
    if (!/^\d+$/.test(id)) throw notFound("User not found.");
    await deleteUser(admin, Number(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "DELETE /api/users/[id]");
  }
}
