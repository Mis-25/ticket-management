import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/httpError";
import { getTicketDetail } from "@/services/ticketService";

// GET /api/tickets/TKT-6  → ticket + is user ke allowed actions (can)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json(await getTicketDetail(user, id));
  } catch (error) {
    return errorResponse(error, "GET /api/tickets/[id]");
  }
}
