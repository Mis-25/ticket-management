import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";

/**
 * API me jaan-boojh kar bheja gaya error (401, 403, 404, 400, 409...).
 * Route handlers isko pakad kar sahi HTTP response bhejte hain.
 */
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
  new HttpError(401, "Please select a user to continue.");
export const forbidden = (message = "You are not allowed to do this.") =>
  new HttpError(403, message);
export const notFound = (message = "Not found.") => new HttpError(404, message);
export const badRequest = (message: string, fields?: Record<string, string>) =>
  new HttpError(400, message, fields);

/** Kisi bhi error ko JSON response me badalta hai. Unknown error = 500. */
export function errorResponse(error: unknown, context: string) {
  // Next.js ki andar wali errors (jaise build ke time cookies() ka prerender
  // signal) ko nahi pakadna — Next.js ko wapas do.
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

/** Request body ko JSON object ke roop me padhta hai (galat JSON = {}). */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const asText = (value: unknown) => (typeof value === "string" ? value : "");
