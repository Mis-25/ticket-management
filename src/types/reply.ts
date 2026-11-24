export type CommentType = "public" | "internal";

export interface ReplyUser {
  id: number;
  name: string;
  roleName: string;
}

export interface TicketReply {
  id: number;
  ticketId: string; // e.g. "TKT-6"
  message: string;
  commentType: CommentType;
  createdAt: string;
  user: ReplyUser;
}

export interface CreateReplyInput {
  message: string;
  commentType: CommentType;
}

export const REPLY_MESSAGE_LIMIT = 5000;

export type ReplyErrors = Partial<Record<keyof CreateReplyInput, string>>;

/** Frontend aur backend dono isi validation ko use karte hain. */
export function validateReply(input: CreateReplyInput): ReplyErrors {
  const errors: ReplyErrors = {};
  const message = input.message.trim();

  if (input.commentType !== "public" && input.commentType !== "internal")
    errors.commentType = "Invalid comment type.";

  if (message === "") errors.message = "Message is required.";
  else if (message.length > REPLY_MESSAGE_LIMIT)
    errors.message = `Message must be at most ${REPLY_MESSAGE_LIMIT} characters.`;

  return errors;
}
