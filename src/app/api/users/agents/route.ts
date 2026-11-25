import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/httpError";
import { listUsersWithPermission } from "@/services/userService";

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json(await listUsersWithPermission("ticket.view_assigned"));
  } catch (error) {
    return errorResponse(error, "GET /api/users/agents");
  }
}
