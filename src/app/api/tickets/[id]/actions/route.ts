import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { asText, badRequest, errorResponse, readJson } from "@/lib/httpError";
import { performTicketAction } from "@/services/ticketService";
import { TICKET_ACTIONS, TicketAction } from "@/types/ticket";

// POST /api/tickets/TKT-6/actions
// body: { action: "assign"|"start"|"hold"|"resolve"|"close"|"reopen",
//         reason?: string, assigneeId?: number }
// Permission + allowed transition backend par check hota hai.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request);

    const action = asText(body.action) as TicketAction;
    if (!TICKET_ACTIONS.includes(action)) throw badRequest("Unknown action.");

    const ticket = await performTicketAction(user, id, {
      action,
      reason: asText(body.reason),
      assigneeId: typeof body.assigneeId === "number" ? body.assigneeId : undefined,
    });
    return NextResponse.json(ticket);
  } catch (error) {
    return errorResponse(error, "POST /api/tickets/[id]/actions");
  }
}
