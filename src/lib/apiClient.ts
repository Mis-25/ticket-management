export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init.body && !isForm ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    let message = "Something went wrong. Please try again.";
    let fields: Record<string, string> = {};
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
      if (data?.fields) fields = data.fields;
    } catch {}
    throw new ApiError(response.status, message, fields);
  }
  return response.json() as Promise<T>;
}

export const postJson = <T>(url: string, body: unknown) =>
  apiFetch<T>(url, { method: "POST", body: JSON.stringify(body) });

export const patchJson = <T>(url: string, body: unknown) =>
  apiFetch<T>(url, { method: "PATCH", body: JSON.stringify(body) });

export const deleteJson = <T>(url: string) => apiFetch<T>(url, { method: "DELETE" });

export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
