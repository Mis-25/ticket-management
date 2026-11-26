import { NextResponse } from "next/server";
import { startSession } from "@/lib/auth";
import { asText, badRequest, errorResponse, HttpError, readJson } from "@/lib/httpError";
import { verifyPassword } from "@/lib/password";
import { findLoginUser } from "@/services/userService";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const email = asText(body.email).trim();
    const password = asText(body.password);

    const errors: Record<string, string> = {};
    if (email === "") errors.email = "Email is required.";
    if (password === "") errors.password = "Password is required.";
    if (Object.keys(errors).length > 0) throw badRequest("Please fill in all fields.", errors);

    const user = await findLoginUser(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new HttpError(401, "Invalid email or password.");
    }

    await startSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "POST /api/auth/login");
  }
}
