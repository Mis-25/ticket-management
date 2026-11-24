import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/httpError";

// GET /api/auth/me  → logged-in user (role + permissions). Login nahi = 401.
export async function GET() {
  try {
    return NextResponse.json(await requireUser());
  } catch (error) {
    return errorResponse(error, "GET /api/auth/me");
  }
}
