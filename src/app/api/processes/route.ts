import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/httpError";
import { listActiveProcesses } from "@/services/processService";

// GET /api/processes  → company ke active processes (ticket form dropdown)
export async function GET() {
  try {
    await requireUser();
    return NextResponse.json(await listActiveProcesses());
  } catch (error) {
    return errorResponse(error, "GET /api/processes");
  }
}
