export type TicketStatus = "Open" | "Closed";

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  createdAt: string; 
}

export interface CreateTicketInput {
  title: string;
  description: string;
}