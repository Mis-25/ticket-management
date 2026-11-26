import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";

export class HttpError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export const unauthorized = () =>
  new HttpError(401, "Please log in to continue.");
export const forbidden = (message = "You are not allowed to do this.") =>
  new HttpError(403, message);
export const notFound = (message = "Not found.") => new HttpError(404, message);
export const badRequest = (message: string, fields?: Record<string, string>) =>
  new HttpError(400, message, fields);

export function errorResponse(error: unknown, context: string) {
  unstable_rethrow(error);

  if (error instanceof HttpError) {
    return NextResponse.json(
      { error: error.message, ...(error.fields ? { fields: error.fields } : {}) },
      { status: error.status }
    );
  }
  console.error(`${context} failed:`, error);
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 }
  );
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const asText = (value: unknown) => (typeof value === "string" ? value : "");
