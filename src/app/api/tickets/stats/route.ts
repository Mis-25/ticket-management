import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/httpError";
import { getTicketStats } from "@/services/ticketService";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(await getTicketStats(user));
  } catch (error) {
    return errorResponse(error, "GET /api/tickets/stats");
  }
}
