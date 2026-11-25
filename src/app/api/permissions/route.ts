import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { errorResponse } from "@/lib/httpError";
import { listPermissions } from "@/services/roleService";

export async function GET() {
  try {
    await requirePermission("user.manage");
    return NextResponse.json(await listPermissions());
  } catch (error) {
    return errorResponse(error, "GET /api/permissions");
  }
}
