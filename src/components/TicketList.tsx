import { Ticket } from "@/types/ticket";
import TicketCard from "./TicketCard";

interface TicketListProps {
  tickets: Ticket[];
  isLoading: boolean;
  closingId: string | null;
  onClose: (id: string) => void;
}

export default function TicketList({
  tickets,
  isLoading,
  closingId,
  onClose,
}: TicketListProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="px-4 py-3 text-sm font-semibold">#</th>
              <th className="px-4 py-3 text-sm font-semibold">Ticket ID</th>
              <th className="px-4 py-3 text-sm font-semibold">Title</th>
              <th className="px-4 py-3 text-sm font-semibold">Description</th>
              <th className="px-4 py-3 text-sm font-semibold">Status</th>
              <th className="px-4 py-3 text-sm font-semibold">Created At</th>
              <th className="px-4 py-3 text-sm font-semibold">Action</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  Loading tickets...
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  No tickets yet. Click &quot;Add Ticket&quot; to create your
                  first ticket.
                </td>
              </tr>
            ) : (
              tickets.map((ticket, i) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  index={i + 1}
                  onClose={onClose}
                  isClosing={closingId === ticket.id}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}