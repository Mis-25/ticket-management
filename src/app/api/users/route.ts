import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { asText, badRequest, errorResponse, readJson } from "@/lib/httpError";
import { createUser, listUsers } from "@/services/userService";
import { CreateUserInput, RoleId, validateUser } from "@/types/user";

export async function GET() {
  try {
    await requirePermission("user.manage");
    return NextResponse.json(await listUsers());
  } catch (error) {
    return errorResponse(error, "GET /api/users");
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission("user.manage");
    const body = await readJson(request);

    const input: CreateUserInput = {
      name: asText(body.name),
      email: asText(body.email),
      phoneNumber: asText(body.phoneNumber),
      roleId: body.roleId as RoleId,
    };
    const errors = validateUser(input);
    if (Object.keys(errors).length > 0) {
      throw badRequest("Please fix the highlighted fields", errors);
    }

    return NextResponse.json(await createUser(input), { status: 201 });
  } catch (error) {
    return errorResponse(error, "POST /api/users");
  }
}
