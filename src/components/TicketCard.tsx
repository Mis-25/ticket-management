"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { TrashIcon } from "@/components/Icons";
import { formatDateTime } from "@/lib/format";
import { Ticket } from "@/types/ticket";

interface TicketCardProps {
  ticket: Ticket;
  onDelete?: (ticket: Ticket) => void;
}

interface TooltipPosition {
  left: number;
  top?: number;
  bottom?: number;
}

export default function TicketCard({ ticket, onDelete }: TicketCardProps) {
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);

  function showTooltip() {
    const element = descriptionRef.current;
    if (!element || element.scrollWidth <= element.clientWidth) return;

    const rect = element.getBoundingClientRect();
    const tooltipWidth = 384;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - tooltipWidth - 16));

    if (window.innerHeight - rect.bottom < 220) {
      setTooltipPosition({ left, bottom: window.innerHeight - rect.top + 8 });
    } else {
      setTooltipPosition({ left, top: rect.bottom + 8 });
    }
  }

  return (
    <tr>
      <td className="cell-nowrap">{ticket.id}</td>

      <td>
        <Link
          href={`/tickets/${encodeURIComponent(ticket.id)}`}
          className="cell-title cell-title-link"
        >
          {ticket.title}
        </Link>
        <div
          ref={descriptionRef}
          onMouseEnter={showTooltip}
          onMouseLeave={() => setTooltipPosition(null)}
          className="cell-truncate cell-sub"
        >
          {ticket.description}
        </div>
        {tooltipPosition && (
          <div
            role="tooltip"
            style={{
              left: tooltipPosition.left,
              top: tooltipPosition.top,
              bottom: tooltipPosition.bottom,
            }}
            className="tooltip"
          >
            {ticket.description}
          </div>
        )}
      </td>

      <td>{ticket.process?.name ?? <span className="text-muted-cell">—</span>}</td>

      <td>
        <PriorityBadge priority={ticket.priority} />
      </td>

      <td>
        <StatusBadge status={ticket.status} />
      </td>

      <td>{ticket.createdBy?.name ?? "—"}</td>

      <td>{ticket.assignedTo?.name ?? <span className="text-muted-cell">Unassigned</span>}</td>

      <td className="cell-nowrap">{formatDateTime(ticket.createdAt)}</td>

      {onDelete && (
        <td>
          <div className="row-actions">
            <button
              type="button"
              onClick={() => onDelete(ticket)}
              className="btn-icon-danger"
              aria-label={`Delete ticket ${ticket.id}`}
              title="Delete"
            >
              <TrashIcon />
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}
