import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/httpError";

export async function GET() {
  try {
    return NextResponse.json(await requireUser());
  } catch (error) {
    return errorResponse(error, "GET /api/auth/me");
  }
}
