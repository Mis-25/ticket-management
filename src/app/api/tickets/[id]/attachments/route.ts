import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { badRequest, errorResponse } from "@/lib/httpError";
import { listAttachments, uploadAttachment } from "@/services/attachmentService";

type Params = { params: Promise<{ id: string }> };

// GET /api/tickets/TKT-6/attachments
export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json(await listAttachments(user, id));
  } catch (error) {
    return errorResponse(error, "GET attachments");
  }
}

// POST /api/tickets/TKT-6/attachments   multipart form-data: file
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      throw badRequest("Please choose a file.", { file: "Please choose a file." });
    }

    return NextResponse.json(await uploadAttachment(user, id, file), { status: 201 });
  } catch (error) {
    return errorResponse(error, "POST attachment");
  }
}
