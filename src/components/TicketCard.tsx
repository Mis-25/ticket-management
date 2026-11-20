"use client";

import { useRef, useState } from "react";
import { Ticket } from "@/types/ticket";

interface TicketCardProps {
  ticket: Ticket;
  index: number;
  onClose: (id: string) => void;
  isClosing: boolean;
}

interface TooltipPosition {
  left: number;
  top?: number;
  bottom?: number;
}

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function TicketCard({
  ticket,
  index,
  onClose,
  isClosing,
}: TicketCardProps) {
  const isOpen = ticket.status === "Open";
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] =
    useState<TooltipPosition | null>(null);

  function showTooltip() {
    const element = descriptionRef.current;
    if (!element) return;

    const isTruncated = element.scrollWidth > element.clientWidth;
    if (!isTruncated) return;

    const rect = element.getBoundingClientRect();
    const tooltipWidth = 384; // max-w-sm
    const left = Math.max(
      8,
      Math.min(rect.left, window.innerWidth - tooltipWidth - 16)
    );

    if (window.innerHeight - rect.bottom < 220) {
      setTooltipPosition({ left, bottom: window.innerHeight - rect.top + 8 });
    } else {
      setTooltipPosition({ left, top: rect.bottom + 8 });
    }
  }

  function hideTooltip() {
    setTooltipPosition(null);
  }

  return (
    <tr className="border-b border-slate-200 transition hover:bg-blue-50/50">
      <td className="px-4 py-4 text-sm font-bold text-slate-900">{index}</td>

      <td className="px-4 py-4 text-sm">
        <span className="whitespace-nowrap font-mono text-slate-700">
          {ticket.id}
        </span>
      </td>

      <td className="px-4 py-4 text-sm font-semibold text-slate-900">
        {ticket.title}
      </td>

      <td className="px-4 py-4 text-sm text-slate-600">
        <div
          ref={descriptionRef}
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
          className="max-w-[240px] cursor-default truncate"
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
            className="pointer-events-none fixed z-50 max-h-52 w-96 max-w-[calc(100vw-1rem)] overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-slate-900 px-4 py-3 text-sm leading-relaxed text-white shadow-xl"
          >
            {ticket.description}
          </div>
        )}
      </td>

      <td className="px-4 py-4 text-sm">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isOpen
              ? "bg-green-100 text-green-800"
              : "bg-slate-200 text-slate-700"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isOpen ? "bg-green-600" : "bg-slate-500"
            }`}
          />
          {ticket.status}
        </span>
      </td>

      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
        {formatDateTime(ticket.createdAt)}
      </td>

      <td className="px-4 py-4 text-sm">
        {isOpen ? (
          <button
            type="button"
            onClick={() => onClose(ticket.id)}
            disabled={isClosing}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isClosing ? "Closing..." : "Close"}
          </button>
        ) : (
          <span className="text-slate-400">&mdash;</span>
        )}
      </td>
    </tr>
  );
}