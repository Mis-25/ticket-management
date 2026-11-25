import { NextResponse } from "next/server";
import { requirePermission, requireUser } from "@/lib/auth";
import { asText, badRequest, errorResponse, readJson } from "@/lib/httpError";
import { createRole, listRoles } from "@/services/roleService";
import { validateRole } from "@/types/role";

const asCodes = (value: unknown) =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json(await listRoles());
  } catch (error) {
    return errorResponse(error, "GET /api/roles");
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission("user.manage");
    const body = await readJson(request);
    const input = {
      name: asText(body.name).trim(),
      description: asText(body.description).trim(),
      permissions: asCodes(body.permissions),
    };
    const errors = validateRole(input);
    if (Object.keys(errors).length > 0) {
      throw badRequest("Please fix the highlighted fields", errors);
    }
    return NextResponse.json(await createRole(input), { status: 201 });
  } catch (error) {
    return errorResponse(error, "POST /api/roles");
  }
}
