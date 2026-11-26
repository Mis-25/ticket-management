import { connection, NextResponse } from "next/server";
import { startSession } from "@/lib/auth";
import { asText, badRequest, errorResponse, HttpError, readJson } from "@/lib/httpError";
import { createFirstAdmin, isSetupNeeded } from "@/services/userService";
import { ROLES, validateUser } from "@/types/user";

export async function GET() {
  try {
    await connection();
    return NextResponse.json({ needed: await isSetupNeeded() });
  } catch (error) {
    return errorResponse(error, "GET /api/setup");
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isSetupNeeded())) {
      throw new HttpError(409, "An Admin already exists.");
    }

    const body = await readJson(request);
    const input = {
      name: asText(body.name),
      email: asText(body.email),
      phoneNumber: asText(body.phoneNumber),
      roleId: ROLES.ADMIN,
      password: asText(body.password),
    };
    const errors = validateUser(input);
    if (Object.keys(errors).length > 0) {
      throw badRequest("Please fix the highlighted fields", errors);
    }

    const admin = await createFirstAdmin(input);
    await startSession(admin.id);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "POST /api/setup");
  }
}
