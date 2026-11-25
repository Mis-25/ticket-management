import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { asText, badRequest, errorResponse, notFound, readJson } from "@/lib/httpError";
import { deleteProcess, updateProcess } from "@/services/processService";
import { ProcessInput, validateProcess } from "@/types/ticket";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("process.manage");
    const { id } = await params;
    if (!/^\d+$/.test(id)) throw notFound("Process not found.");
    const body = await readJson(request);

    const input: ProcessInput = {};
    if ("name" in body) input.name = asText(body.name).trim();
    if ("sortOrder" in body) input.sortOrder = Number(body.sortOrder);
    if ("isActive" in body) {
      if (typeof body.isActive !== "boolean") throw badRequest("Invalid status.");
      input.isActive = body.isActive;
    }

    const errors = validateProcess(input);
    if (Object.keys(errors).length > 0) {
      throw badRequest("Please fix the highlighted fields", errors);
    }

    return NextResponse.json(await updateProcess(Number(id), input));
  } catch (error) {
    return errorResponse(error, "PATCH /api/processes/[id]");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("process.manage");
    const { id } = await params;
    if (!/^\d+$/.test(id)) throw notFound("Process not found.");
    await deleteProcess(Number(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "DELETE /api/processes/[id]");
  }
}
