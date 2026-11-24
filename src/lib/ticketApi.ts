import { apiFetch, postJson } from "@/lib/apiClient";
import {
  ActivityEntry,
  CreateTicketInput,
  Process,
  Ticket,
  TicketActionInput,
  TicketAttachment,
  TicketDetail,
  TicketFilters,
  TicketStats,
} from "@/types/ticket";
import { CreateReplyInput, TicketReply } from "@/types/reply";

const API_URL = "/api/tickets";
const ticketUrl = (id: string) => `${API_URL}/${encodeURIComponent(id)}`;

export function listTickets(filters: TicketFilters = {}): Promise<Ticket[]> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const qs = query.toString();
  return apiFetch<Ticket[]>(qs ? `${API_URL}?${qs}` : API_URL);
}

export const getTicketStats = () => apiFetch<TicketStats>(`${API_URL}/stats`);

export const listProcesses = () => apiFetch<Process[]>("/api/processes");

export const createTicket = (input: CreateTicketInput) =>
  postJson<Ticket>(API_URL, input);

export const getTicket = (id: string) => apiFetch<TicketDetail>(ticketUrl(id));

export const performTicketAction = (id: string, input: TicketActionInput) =>
  postJson<TicketDetail>(`${ticketUrl(id)}/actions`, input);

export const listReplies = (id: string) =>
  apiFetch<TicketReply[]>(`${ticketUrl(id)}/replies`);

export const sendReply = (id: string, input: CreateReplyInput) =>
  postJson<TicketReply>(`${ticketUrl(id)}/replies`, input);

export const listActivity = (id: string) =>
  apiFetch<ActivityEntry[]>(`${ticketUrl(id)}/activity`);

export const listAttachments = (id: string) =>
  apiFetch<TicketAttachment[]>(`${ticketUrl(id)}/attachments`);

export function uploadAttachment(id: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<TicketAttachment>(`${ticketUrl(id)}/attachments`, {
    method: "POST",
    body: form,
  });
}

export const attachmentUrl = (attachmentId: number) =>
  `/api/attachments/${attachmentId}`;
