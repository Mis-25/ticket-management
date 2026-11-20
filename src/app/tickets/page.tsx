"use client";

import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/Modal";
import TicketForm from "@/components/TicketForm";
import TicketList from "@/components/TicketList";
import { closeTicket, createTicket, listTickets } from "@/lib/ticketApi";

import { CreateTicketInput, Ticket } from "@/types/ticket";

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const closeModal = useCallback(() => setIsModalOpen(false), []);

  useEffect(() => {
    let isActive = true;

    async function loadTickets() {
      try {
        const data = await listTickets();
        if (isActive) setTickets(data);
      } catch {
        if (isActive) setErrorMessage("Failed to load tickets.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadTickets();
    return () => {
      isActive = false;
    };
  }, []);

  async function handleCreate(input: CreateTicketInput) {
    setErrorMessage("");
    await createTicket(input);
    setTickets(await listTickets()); // list automatically update
    setIsModalOpen(false); // ticket banne ke baad modal band
  }

  async function handleClose(id: string) {
    setErrorMessage("");
    setClosingId(id);
    try {
      await closeTicket(id);
      setTickets(await listTickets()); // list automatically update
    } catch {
      setErrorMessage("Could not close the ticket. Please try again.");
    } finally {
      setClosingId(null);
    }
  }

  const openCount = tickets.filter((t) => t.status === "Open").length;
  const closedCount = tickets.filter((t) => t.status === "Closed").length;

  return (
    <div className="space-y-6">
      {/* Page heading + Add button (top-right corner) */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tickets</h2>
          <p className="text-sm text-slate-500">
            Manage all your helpdesk tickets here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <span className="text-lg leading-none">+</span>
          Add Ticket
        </button>
      </div>

      {/* Dashboard summary */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total Tickets</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {tickets.length}
          </p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
          <p className="text-sm text-green-700">Open</p>
          <p className="mt-1 text-2xl font-bold text-green-800">{openCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-100 p-4 shadow-sm">
          <p className="text-sm text-slate-600">Closed</p>
          <p className="mt-1 text-2xl font-bold text-slate-700">
            {closedCount}
          </p>
        </div>
      </section>

      {/* Ticket table */}
      <section>
        {errorMessage && (
          <p
            className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {errorMessage}
          </p>
        )}

        <TicketList
          tickets={tickets}
          isLoading={isLoading}
          closingId={closingId}
          onClose={handleClose}
        />
      </section>

      {/* New Ticket modal */}
      <Modal isOpen={isModalOpen} title="New Ticket" onClose={closeModal}>
        <TicketForm onCreate={handleCreate} onCancel={closeModal} />
      </Modal>
    </div>
  );
}