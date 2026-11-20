import { NextResponse } from "next/server";
import { createTicket, listTickets } from "@/services/ticketService";

// GET /api/tickets  → saare tickets (newest first)
export async function GET() {
  try {
    const tickets = await listTickets();
    return NextResponse.json(tickets);
  } catch (error) {
    console.error("GET /api/tickets failed:", error);
    return NextResponse.json(
      { error: "Failed to load tickets" },
      { status: 500 }
    );
  }
}

// POST /api/tickets  → naya ticket
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description =
      typeof body?.description === "string" ? body.description.trim() : "";

    if (title === "" || description === "") {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    const ticket = await createTicket({ title, description });
    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error("POST /api/tickets failed:", error);
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 }
    );
  }
}