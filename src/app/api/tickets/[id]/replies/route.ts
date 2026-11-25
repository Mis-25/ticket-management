import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { asText, badRequest, errorResponse, readJson } from "@/lib/httpError";
import { createReply, listReplies } from "@/services/replyService";
import { CommentType, CreateReplyInput, validateReply } from "@/types/reply";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json(await listReplies(user, id));
  } catch (error) {
    return errorResponse(error, "GET replies");
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request);

    const input: CreateReplyInput = {
      message: asText(body.message),
      commentType: (asText(body.commentType) || "public") as CommentType,
    };
    const errors = validateReply(input);
    if (Object.keys(errors).length > 0) {
      throw badRequest("Please fix the highlighted fields", errors);
    }

    return NextResponse.json(await createReply(user, id, input), { status: 201 });
  } catch (error) {
    return errorResponse(error, "POST reply");
  }
}
