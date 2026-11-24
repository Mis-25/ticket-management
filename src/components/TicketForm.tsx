"use client";

import { useEffect, useState } from "react";
import { ApiError, errorMessage } from "@/lib/apiClient";
import { listProcesses } from "@/lib/ticketApi";
import {
  CreateTicketInput,
  Process,
  TICKET_PRIORITIES,
  TicketPriority,
} from "@/types/ticket";

interface TicketFormProps {
  onCreate: (input: CreateTicketInput) => Promise<void>;
  onCancel: () => void;
}

interface FormErrors {
  title?: string;
  description?: string;
  priority?: string;
  processId?: string;
}

export default function TicketForm({ onCreate, onCancel }: TicketFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("Medium");
  const [processId, setProcessId] = useState("");
  const [processes, setProcesses] = useState<Process[]>([]);
  const [processLoadError, setProcessLoadError] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Company ke processes — database se
  useEffect(() => {
    let isActive = true;
    listProcesses()
      .then((data) => {
        if (!isActive) return;
        setProcesses(data);
        setProcessLoadError(
          data.length === 0 ? "No processes are set up yet. Please contact the Admin." : ""
        );
      })
      .catch((error) => {
        if (isActive) setProcessLoadError(errorMessage(error, "Could not load processes."));
      });
    return () => {
      isActive = false;
    };
  }, []);

  function validate(): FormErrors {
    const newErrors: FormErrors = {};
    if (title.trim() === "") {
      newErrors.title = "Subject is required. Please enter a ticket subject.";
    }
    if (processId === "") {
      newErrors.processId = "Process is required. Please select a process.";
    }
    if (description.trim() === "") {
      newErrors.description = "Description is required. Please describe the issue.";
    }
    return newErrors;
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await onCreate({ title, description, priority, processId: Number(processId) });
      setTitle("");
      setDescription("");
      setPriority("Medium");
      setProcessId("");
      setErrors({});
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length) {
        setErrors(error.fields);
      } else {
        setSubmitError(errorMessage(error, "Could not create the ticket."));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-fields">
        <div>
          <label htmlFor="title" className="form-label">
            Subject
          </label>
          <input
            id="title"
            type="text"
            value={title}
            maxLength={255}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Login Issue"
            className={`form-input ${errors.title ? "form-input-error" : ""}`}
          />
          {errors.title && (
            <p className="form-error" role="alert">
              {errors.title}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="process" className="form-label">
            Process
          </label>
          <select
            id="process"
            value={processId}
            onChange={(e) => setProcessId(e.target.value)}
            className={`form-input ${errors.processId ? "form-input-error" : ""}`}
          >
            <option value="">Select process</option>
            {processes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {(errors.processId || processLoadError) && (
            <p className="form-error" role="alert">
              {errors.processId || processLoadError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="priority" className="form-label">
            Priority
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TicketPriority)}
            className={`form-input ${errors.priority ? "form-input-error" : ""}`}
          >
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {errors.priority && (
            <p className="form-error" role="alert">
              {errors.priority}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="form-label">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            value={description}
            maxLength={10000}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain the problem in detail..."
            className={`form-input ${errors.description ? "form-input-error" : ""}`}
          />
          {errors.description && (
            <p className="form-error" role="alert">
              {errors.description}
            </p>
          )}
        </div>

        {submitError && (
          <p className="alert-error" role="alert">
            {submitError}
          </p>
        )}
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn-submit">
          {isSubmitting ? "Creating..." : "Create Ticket"}
        </button>
      </div>
    </form>
  );
}
