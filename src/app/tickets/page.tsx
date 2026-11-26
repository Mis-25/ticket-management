"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth, useRequireAuth } from "@/components/AuthProvider";
import Modal from "@/components/Modal";
import TicketForm from "@/components/TicketForm";
import TicketList from "@/components/TicketList";
import UserForm from "@/components/UserForm";
import { errorMessage } from "@/lib/apiClient";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import {
  createTicket,
  deleteTicket,
  getTicketStats,
  listProcesses,
  listTickets,
} from "@/lib/ticketApi";
import { listAssignees } from "@/lib/userApi";
import {
  CreateTicketInput,
  Process,
  Ticket,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TicketFilters,
  TicketPriority,
  TicketStats,
  TicketStatus,
} from "@/types/ticket";
import { User } from "@/types/user";

const STAT_CARDS: { key: "total" | TicketStatus; label: string; className: string }[] = [
  { key: "total", label: "Total Tickets", className: "stat-total" },
  { key: "Open", label: "Open", className: "stat-open" },
  { key: "Assigned", label: "Assigned", className: "stat-assigned" },
  { key: "In Progress", label: "In Progress", className: "stat-progress" },
  { key: "On Hold", label: "On Hold", className: "stat-hold" },
  { key: "Resolved", label: "Resolved", className: "stat-resolved" },
  { key: "Closed", label: "Closed", className: "stat-closed" },
  { key: "Reopened", label: "Reopened", className: "stat-reopened" },
];

function pageSubtitle(can: (p: string) => boolean): string {
  if (can("ticket.view_all")) return "All tickets in the system.";
  const parts: string[] = [];
  if (can("ticket.view_own")) parts.push("tickets you raised");
  if (can("ticket.view_assigned")) parts.push("tickets assigned to you");
  if (can("ticket.assign")) parts.push("tickets where you are the assigning manager");
  if (parts.length === 0) return "";
  const text = parts.join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1) + ".";
}

export default function TicketsPage() {
  const user = useRequireAuth();
  const { can } = useAuth();
  const router = useRouter();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [agents, setAgents] = useState<{ id: number; name: string }[]>([]);
  const [filters, setFilters] = useState<TicketFilters>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingTicket, setDeletingTicket] = useState<Ticket | null>(null);
  const [processes, setProcesses] = useState<Process[]>([]);
  const closeDeleteDialog = useCallback(() => setDeletingTicket(null), []);

  const closeTicketModal = useCallback(() => setIsTicketModalOpen(false), []);
  const closeUserModal = useCallback(() => setIsUserModalOpen(false), []);
  const canAssign = can("ticket.assign");

  useEffect(() => {
    if (!user) return;
    let isActive = true;

    async function load() {
      try {
        const [ticketData, statData] = await Promise.all([
          listTickets(filters),
          getTicketStats(),
        ]);
        if (!isActive) return;
        setTickets(ticketData);
        setStats(statData);
        setErrorText("");
      } catch (error) {
        if (isActive) setErrorText(errorMessage(error, "Failed to load tickets."));
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    load();
    return () => {
      isActive = false;
    };
  }, [user, filters, reloadKey]);

  useEffect(() => {
    if (!user) return;
    listProcesses().then(setProcesses).catch(() => setProcesses([]));
  }, [user]);

  useEffect(() => {
    if (!user || !canAssign) return;
    listAssignees().then(setAgents).catch(() => setAgents([]));
  }, [user, canAssign]);

  if (!user) return <p className="reply-empty">Loading...</p>;

  async function handleCreate(input: CreateTicketInput) {
    await createTicket(input);
    setIsTicketModalOpen(false);
    setReloadKey((k) => k + 1);
  }

  async function handleDeleteTicket() {
    if (!deletingTicket) return;
    await deleteTicket(deletingTicket.id);
    setDeletingTicket(null);
    setReloadKey((k) => k + 1);
  }

  function handleUserCreated(created: User) {
    setIsUserModalOpen(false);
    router.push(`/users?new=${created.id}`);
  }

  function setFilter<K extends keyof TicketFilters>(key: K, value: TicketFilters[K] | "") {
    setFilters((prev) => {
      const next = { ...prev };
      if (value === "" || value === undefined) delete next[key];
      else next[key] = value as TicketFilters[K];
      return next;
    });
  }

  const hasFilters = Object.keys(filters).length > 0;
  const isAssignedToMe = filters.assignedTo === "me";

  return (
    <div className="page-wrapper">
      <div className="page-head">
        <div>
          <h2 className="page-title">Tickets</h2>
          <p className="page-subtitle">{pageSubtitle(can)}</p>
        </div>
        <div className="page-actions">
          {can("user.manage") && (
            <button type="button" onClick={() => setIsUserModalOpen(true)} className="btn-small">
              + Add user
            </button>
          )}
          {can("ticket.create") && (
            <button type="button" onClick={() => setIsTicketModalOpen(true)} className="btn-primary">
              Add ticket
            </button>
          )}
        </div>
      </div>

      <section className="stat-grid-8">
        {STAT_CARDS.map((card) => {
          const isActive =
            card.key === "total" ? !filters.status : filters.status === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setFilter("status", card.key === "total" ? "" : card.key)}
              className={`stat-card stat-card-button ${card.className} ${
                isActive ? "stat-card-active" : ""
              }`}
              aria-pressed={isActive}
            >
              <span className="stat-label">{card.label}</span>
              <span className="stat-value">{stats ? stats[card.key] : "–"}</span>
            </button>
          );
        })}
      </section>

      <section className="filter-bar" aria-label="Filters">
        <div className="filter-item">
          <label htmlFor="f-process" className="filter-label">Process</label>
          <select
            id="f-process"
            value={filters.processId ?? ""}
            onChange={(e) => setFilter("processId", e.target.value ? Number(e.target.value) : "")}
            className="filter-input"
          >
            <option value="">All Processes</option>
            {processes.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label htmlFor="f-status" className="filter-label">Status</label>
          <select
            id="f-status"
            value={filters.status ?? ""}
            onChange={(e) => setFilter("status", e.target.value as TicketStatus)}
            className="filter-input"
          >
            <option value="">All</option>
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label htmlFor="f-priority" className="filter-label">Priority</label>
          <select
            id="f-priority"
            value={filters.priority ?? ""}
            onChange={(e) => setFilter("priority", e.target.value as TicketPriority)}
            className="filter-input"
          >
            <option value="">All</option>
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {canAssign && (
          <div className="filter-item">
            <label htmlFor="f-assignee" className="filter-label">Assigned To</label>
            <select
              id="f-assignee"
              value={filters.assignedTo === "me" ? "" : (filters.assignedTo ?? "")}
              onChange={(e) =>
                setFilter(
                  "assignedTo",
                  e.target.value === "unassigned"
                    ? "unassigned"
                    : e.target.value
                      ? Number(e.target.value)
                      : ""
                )
              }
              className="filter-input"
            >
              <option value="">Anyone</option>
              <option value="unassigned">Unassigned</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-item">
          <label htmlFor="f-from" className="filter-label">Created From</label>
          <input
            id="f-from"
            type="date"
            value={filters.from ?? ""}
            max={filters.to}
            onChange={(e) => setFilter("from", e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-item">
          <label htmlFor="f-to" className="filter-label">Created To</label>
          <input
            id="f-to"
            type="date"
            value={filters.to ?? ""}
            min={filters.from}
            onChange={(e) => setFilter("to", e.target.value)}
            className="filter-input"
          />
        </div>

        <button
          type="button"
          onClick={() => setFilter("assignedTo", isAssignedToMe ? "" : "me")}
          className={`${isAssignedToMe ? "btn-submit" : "btn-secondary"} filter-reset`}
          aria-pressed={isAssignedToMe}
        >
          Assigned to Me
        </button>

        {hasFilters && (
          <button type="button" onClick={() => setFilters({})} className="btn-secondary filter-reset">
            Clear filters
          </button>
        )}
      </section>

      <section>
        {errorText && (
          <p className="alert-error" role="alert">
            {errorText}
          </p>
        )}

        <TicketList
          tickets={tickets}
          isLoading={isLoading}
          emptyMessage={
            hasFilters
              ? "No tickets match these filters."
              : can("ticket.create")
                ? 'No tickets yet. Click "Add ticket" to create one.'
                : "No tickets to show."
          }
          onDelete={can("ticket.delete") ? setDeletingTicket : undefined}
        />
      </section>

      <ConfirmDeleteDialog
        isOpen={deletingTicket !== null}
        title="Delete Ticket"
        message={
          deletingTicket && (
            <>
              Are you sure you want to delete ticket <strong>{deletingTicket.id}</strong> (
              {deletingTicket.title})? It will be removed from all lists.
            </>
          )
        }
        onConfirm={handleDeleteTicket}
        onClose={closeDeleteDialog}
      />

      <Modal isOpen={isTicketModalOpen} title="New Ticket" onClose={closeTicketModal}>
        <TicketForm onCreate={handleCreate} onCancel={closeTicketModal} />
      </Modal>

      <Modal isOpen={isUserModalOpen} title="Add User" onClose={closeUserModal}>
        <UserForm onCreated={handleUserCreated} onCancel={closeUserModal} />
      </Modal>
    </div>
  );
}
