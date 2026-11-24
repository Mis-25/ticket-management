"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { formatDateTime } from "@/lib/format";
import { Ticket } from "@/types/ticket";

interface TicketCardProps {
  ticket: Ticket;
}

interface TooltipPosition {
  left: number;
  top?: number;
  bottom?: number;
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Table ki ek row. Status ab yahan se nahi badalta — ticket detail page par actions hain. */
export default function TicketCard({ ticket }: TicketCardProps) {
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);

  function showTooltip() {
    const element = descriptionRef.current;
    if (!element || element.scrollWidth <= element.clientWidth) return;

    const rect = element.getBoundingClientRect();
    const tooltipWidth = 384; // w-96
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

      <td>
        <div className="row-actions">
          <Link
            href={`/tickets/${encodeURIComponent(ticket.id)}`}
            className="btn-icon"
            aria-label={`View ticket ${ticket.id}`}
            title="View"
          >
            <EyeIcon />
          </Link>
        </div>
      </td>
    </tr>
  );
}
