import { NextResponse } from "next/server";
import { endSession } from "@/lib/auth";
import { errorResponse } from "@/lib/httpError";

export async function POST() {
  try {
    await endSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "POST /api/auth/logout");
  }
}
