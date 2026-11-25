import { Ticket } from "@/types/ticket";
import TicketCard from "./TicketCard";

interface TicketListProps {
  tickets: Ticket[];
  isLoading: boolean;
  emptyMessage: string;
  onDelete?: (ticket: Ticket) => void;
}

export default function TicketList({ tickets, isLoading, emptyMessage, onDelete }: TicketListProps) {
  const columnCount = onDelete ? 9 : 8;

  return (
    <div className="table-card">
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Title</th>
              <th>Process</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Created By</th>
              <th>Assigned To</th>
              <th>Created At</th>
              {onDelete && <th className="th-actions">Actions</th>}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columnCount} className="table-empty">
                  Loading tickets...
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="table-empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} onDelete={onDelete} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
