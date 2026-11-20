import { CreateTicketInput, Ticket } from "@/types/ticket";


const API_URL = "/api/tickets";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Something went wrong";
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
     
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<Ticket>(response);
}

export async function listTickets(): Promise<Ticket[]> {
  const response = await fetch(API_URL, { cache: "no-store" });
  return handleResponse<Ticket[]>(response);
}

export async function closeTicket(id: string): Promise<Ticket> {
  const response = await fetch(`${API_URL}/${encodeURIComponent(id)}/close`, {
    method: "PATCH",
  });
  return handleResponse<Ticket>(response);
}