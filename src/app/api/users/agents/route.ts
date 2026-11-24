import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { errorResponse } from "@/lib/httpError";
import { listSupportAgents } from "@/services/userService";

// GET /api/users/agents  → active Support Agents (assign dropdown + filter, sirf Admin)
export async function GET() {
  try {
    await requirePermission("ticket.assign");
    return NextResponse.json(await listSupportAgents());
  } catch (error) {
    return errorResponse(error, "GET /api/users/agents");
  }
}
