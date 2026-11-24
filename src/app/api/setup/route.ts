import { NextResponse } from "next/server";
import { asText, badRequest, errorResponse, HttpError, readJson } from "@/lib/httpError";
import { createFirstAdmin, isSetupNeeded } from "@/services/userService";
import { ROLES, validateUser } from "@/types/user";

// GET /api/setup  → { needed: true } jab tak koi Admin nahi bana
export async function GET() {
  try {
    return NextResponse.json({ needed: await isSetupNeeded() });
  } catch (error) {
    return errorResponse(error, "GET /api/setup");
  }
}

// POST /api/setup  body: { name, email, phoneNumber }
// Sirf pehli baar (koi Admin na ho tab) chalta hai.
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
    };
    const errors = validateUser(input);
    if (Object.keys(errors).length > 0) {
      throw badRequest("Please fix the highlighted fields", errors);
    }

    await createFirstAdmin(input);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "POST /api/setup");
  }
}
