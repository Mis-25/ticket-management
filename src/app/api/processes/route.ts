import { NextResponse } from "next/server";
import { hasPermission, requirePermission, requireUser } from "@/lib/auth";
import { asText, badRequest, errorResponse, forbidden, readJson } from "@/lib/httpError";
import {
  createProcess,
  listActiveProcesses,
  listAllProcesses,
} from "@/services/processService";
import { ProcessInput, validateProcess } from "@/types/ticket";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    if (new URL(request.url).searchParams.get("all") === "1") {
      if (!hasPermission(user, "process.manage")) throw forbidden();
      return NextResponse.json(await listAllProcesses());
    }
    return NextResponse.json(await listActiveProcesses());
  } catch (error) {
    return errorResponse(error, "GET /api/processes");
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission("process.manage");
    const body = await readJson(request);

    const name = asText(body.name).trim();
    const input: ProcessInput = { name };
    if (body.sortOrder !== undefined && body.sortOrder !== null && body.sortOrder !== "")
      input.sortOrder = Number(body.sortOrder);

    const errors = validateProcess(input);
    if (Object.keys(errors).length > 0) {
      throw badRequest("Please fix the highlighted fields", errors);
    }

    return NextResponse.json(await createProcess(name, input.sortOrder), { status: 201 });
  } catch (error) {
    return errorResponse(error, "POST /api/processes");
  }
}
