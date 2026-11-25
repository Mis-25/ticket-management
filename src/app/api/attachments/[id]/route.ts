import { requireUser } from "@/lib/auth";
import { errorResponse, notFound } from "@/lib/httpError";
import { readAttachment } from "@/services/attachmentService";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!/^\d+$/.test(id)) throw notFound("File not found.");

    const { attachment, data } = await readAttachment(user, Number(id));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": attachment.fileType,
        "Content-Length": String(data.length),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
          attachment.fileName
        )}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error, "GET attachment file");
  }
}
