import { Ticket } from "@/types/ticket";
import TicketCard from "./TicketCard";

interface TicketListProps {
  tickets: Ticket[];
  isLoading: boolean;
  emptyMessage: string;
}

export default function TicketList({ tickets, isLoading, emptyMessage }: TicketListProps) {
  return (
    <div className="table-card">
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Subject</th>
              <th>Process</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Created By</th>
              <th>Assigned To</th>
              <th>Created At</th>
              <th className="th-actions">Actions</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="table-empty">
                  Loading tickets...
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan={9} className="table-empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
