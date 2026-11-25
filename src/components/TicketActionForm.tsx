"use client";

import { useEffect, useState } from "react";
import { ApiError, errorMessage } from "@/lib/apiClient";
import { performTicketAction } from "@/lib/ticketApi";
import { listAssignees, UserOption } from "@/lib/userApi";
import { REASON_LIMIT, TicketAction, TicketDetail } from "@/types/ticket";

interface ActionConfig {
  title: string;
  submitLabel: string;
  help: string;
  reasonLabel?: string;
  reasonRequired?: boolean;
}

export function getActionConfig(action: TicketAction, ticket: TicketDetail): ActionConfig {
  switch (action) {
    case "assign":
      return {
        title: ticket.assignedTo ? "Reassign Ticket" : "Assign Ticket",
        submitLabel: ticket.assignedTo ? "Reassign" : "Assign",
        help: "Select the person (Support Agent, Employee...) who will work on this ticket. Status becomes Assigned.",
        reasonLabel: "Assignment note (optional)",
      };
    case "unassign":
      return {
        title: "Clear Assignment",
        submitLabel: "Clear Assignment",
        help: `${ticket.assignedTo?.name ?? "The staff member"} will be removed from this ticket. It will show as Unassigned${
          ticket.status === "Reopened" ? "" : " and the status becomes Open"
        }.`,
        reasonLabel: "Note (optional)",
      };
    case "start":
      return {
        title: ticket.status === "On Hold" ? "Resume Work" : "Start Work",
        submitLabel: ticket.status === "On Hold" ? "Resume Work" : "Start Work",
        help: "Status will change to In Progress.",
        reasonLabel: "Note (optional)",
      };
    case "hold":
      return {
        title: "Put On Hold",
        submitLabel: "Put On Hold",
        help: "Explain why work is paused (e.g. waiting for user / vendor).",
        reasonLabel: "Hold reason",
        reasonRequired: true,
      };
    case "resolve":
      return {
        title: "Resolve Ticket",
        submitLabel: "Mark as Resolved",
        help: "Describe the solution. The ticket creator will review it.",
        reasonLabel: "Resolution notes",
        reasonRequired: true,
      };
    case "close":
      return ticket.can.closeNeedsReason
        ? {
            title: "Close Ticket",
            submitLabel: "Close Ticket",
            help: "Closing disables public replies. History is kept.",
            reasonLabel: "Close reason",
            reasonRequired: true,
          }
        : {
            title: "Confirm & Close",
            submitLabel: "Confirm & Close",
            help: "Confirm that the issue is solved. You can reopen it later if it happens again.",
            reasonLabel: "Feedback (optional)",
          };
    case "reopen":
      return {
        title: "Reopen Ticket",
        submitLabel: "Reopen Ticket",
        help: "The previous conversation and history stay. The staff member stays assigned; the manager can change it.",
        reasonLabel: "Reopen reason",
        reasonRequired: true,
      };
  }
}

interface TicketActionFormProps {
  ticket: TicketDetail;
  action: TicketAction;
  onDone: (updated: TicketDetail) => void;
  onCancel: () => void;
}

export default function TicketActionForm({
  ticket,
  action,
  onDone,
  onCancel,
}: TicketActionFormProps) {
  const config = getActionConfig(action, ticket);
  const [reason, setReason] = useState("");
  const [assigneeId, setAssigneeId] = useState<number>(0);
  const [agents, setAgents] = useState<UserOption[] | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (action !== "assign") return;
    listAssignees()
      .then(setAgents)
      .catch((error) => setSubmitError(errorMessage(error, "Could not load agents.")));
  }, [action]);

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    const newErrors: Record<string, string> = {};
    if (action === "assign" && !assigneeId) newErrors.assigneeId = "Please select a person to assign.";
    if (config.reasonRequired && reason.trim() === "")
      newErrors.reason = `${config.reasonLabel} is required.`;
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const updated = await performTicketAction(ticket.id, {
        action,
        reason,
        ...(action === "assign" ? { assigneeId } : {}),
      });
      onDone(updated);
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length) setErrors(error.fields);
      else setSubmitError(errorMessage(error, "Action failed."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-fields">
        <p className="form-hint">{config.help}</p>

        {action === "assign" && (
          <div>
            <label htmlFor="action-agent" className="form-label">Assign To</label>
            <select
              id="action-agent"
              value={assigneeId}
              onChange={(e) => setAssigneeId(Number(e.target.value))}
              className={`form-input ${errors.assigneeId ? "form-input-error" : ""}`}
              disabled={agents === null}
            >
              <option value={0}>{agents === null ? "Loading..." : "Select person"}</option>
              {agents?.map((agent) => (
                <option
                  key={agent.id}
                  value={agent.id}
                  disabled={agent.id === ticket.assignedTo?.id}
                >
                  {agent.name} ({agent.roleName})
                  {agent.id === ticket.assignedTo?.id ? " (current)" : ""}
                </option>
              ))}
            </select>
            {agents?.length === 0 && (
              <p className="form-hint">
                Nobody can be assigned tickets yet. Give a role the &quot;Can be assigned
                tickets&quot; permission on the Roles page.
              </p>
            )}
            {errors.assigneeId && (
              <p className="form-error" role="alert">{errors.assigneeId}</p>
            )}
          </div>
        )}

        {config.reasonLabel && (
          <div>
            <label htmlFor="action-reason" className="form-label">
              {config.reasonLabel}
            </label>
            <textarea
              id="action-reason"
              rows={4}
              value={reason}
              maxLength={REASON_LIMIT}
              onChange={(e) => setReason(e.target.value)}
              className={`form-input ${errors.reason ? "form-input-error" : ""}`}
            />
            {errors.reason && (
              <p className="form-error" role="alert">{errors.reason}</p>
            )}
          </div>
        )}

        {submitError && (
          <p className="alert-error" role="alert">{submitError}</p>
        )}
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn-submit">
          {isSubmitting ? "Saving..." : config.submitLabel}
        </button>
      </div>
    </form>
  );
}
