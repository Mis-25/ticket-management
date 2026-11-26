import { NextResponse } from "next/server";
import { requirePermission, requireUser } from "@/lib/auth";
import { asText, badRequest, errorResponse, readJson } from "@/lib/httpError";
import { createTicket, listTickets } from "@/services/ticketService";
import {
  isTicketPriority,
  isTicketStatus,
  TicketFilters,
} from "@/types/ticket";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const query = new URL(request.url).searchParams;

    const filters: TicketFilters = {};
    const status = query.get("status");
    if (status) {
      if (!isTicketStatus(status)) throw badRequest("Invalid status filter.");
      filters.status = status;
    }
    const priority = query.get("priority");
    if (priority) {
      if (!isTicketPriority(priority)) throw badRequest("Invalid priority filter.");
      filters.priority = priority;
    }
    const processId = query.get("processId");
    if (processId) {
      if (!/^\d+$/.test(processId)) throw badRequest("Invalid process filter.");
      filters.processId = Number(processId);
    }
    const assignedTo = query.get("assignedTo");
    if (assignedTo) {
      if (assignedTo === "unassigned") filters.assignedTo = "unassigned";
      else if (assignedTo === "me") filters.assignedTo = user.id;
      else if (/^\d+$/.test(assignedTo)) filters.assignedTo = Number(assignedTo);
      else throw badRequest("Invalid assignee filter.");
    }
    for (const key of ["from", "to"] as const) {
      const value = query.get(key);
      if (value) {
        if (!DATE_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
          throw badRequest(`Invalid "${key}" date.`);
        }
        filters[key] = value;
      }
    }

    return NextResponse.json(await listTickets(user, filters));
  } catch (error) {
    return errorResponse(error, "GET /api/tickets");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("ticket.create");
    const body = await readJson(request);

    const title = asText(body.title).trim();
    const description = asText(body.description).trim();
    const priority = body.priority ?? "Medium";
    const validPriority = isTicketPriority(priority) ? priority : null;

    const errors: Record<string, string> = {};
    if (title === "") errors.title = "Title is required.";
    else if (title.length > 255) errors.title = "Title must be at most 255 characters.";
    if (description === "") errors.description = "Description is required.";
    else if (description.length > 10000)
      errors.description = "Description must be at most 10000 characters.";
    if (!validPriority) errors.priority = "Please select a priority.";
    const processId = Number(body.processId);
    if (!Number.isInteger(processId) || processId <= 0)
      errors.processId = "Please select a process.";
    const managerId = Number(body.managerId);
    if (!Number.isInteger(managerId) || managerId <= 0)
      errors.managerId = "Please select an assigning manager.";
    if (!validPriority || Object.keys(errors).length > 0) {
      throw badRequest("Please fix the highlighted fields", errors);
    }

    const ticket = await createTicket(user, {
      title,
      description,
      priority: validPriority,
      processId,
      managerId,
    });
    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    return errorResponse(error, "POST /api/tickets");
  }
}
