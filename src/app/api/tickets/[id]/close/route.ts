import { NextResponse } from "next/server";
import { closeTicket } from "@/services/ticketService";

// PATCH /api/tickets/TKT-1001/close  → ticket ko Closed karo
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticket = await closeTicket(id);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("PATCH close ticket failed:", error);
    return NextResponse.json(
      { error: "Failed to close ticket" },
      { status: 500 }
    );
  }
}