import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/httpError";
import { listActivity } from "@/services/activityService";

// GET /api/tickets/TKT-6/activity  → Transaction / Activity history (read-only)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json(await listActivity(user, id));
  } catch (error) {
    return errorResponse(error, "GET activity");
  }
}
