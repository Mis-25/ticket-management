import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/httpError";
import { deleteTicket, getTicketDetail } from "@/services/ticketService";

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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await deleteTicket(user, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "DELETE /api/tickets/[id]");
  }
}
