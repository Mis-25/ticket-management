"use client";

import { useState } from "react";
import { ApiError, errorMessage } from "@/lib/apiClient";
import { createProcess, updateProcess } from "@/lib/ticketApi";
import {
  PROCESS_NAME_MAX,
  ProcessErrors,
  ProcessInput,
  ProcessRow,
  validateProcess,
} from "@/types/ticket";

interface ProcessFormProps {
  process?: ProcessRow;
  onSaved: (process: ProcessRow) => void;
  onCancel: () => void;
}

export default function ProcessForm({ process, onSaved, onCancel }: ProcessFormProps) {
  const isEdit = process !== undefined;
  const [name, setName] = useState(process?.name ?? "");
  const [sortOrder, setSortOrder] = useState(process ? String(process.sortOrder) : "");
  const [isActive, setIsActive] = useState(process?.isActive ?? true);
  const [errors, setErrors] = useState<ProcessErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    const input: ProcessInput = { name: name.trim() };
    if (sortOrder.trim() !== "") input.sortOrder = Number(sortOrder);
    if (isEdit) input.isActive = isActive;

    const validationErrors = validateProcess(input);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      onSaved(isEdit ? await updateProcess(process.id, input) : await createProcess(input));
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setErrors(error.fields);
      } else {
        setSubmitError(errorMessage(error, "Could not save process."));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-fields">
        <div>
          <label htmlFor="process-name" className="form-label">Process Name</label>
          <input
            id="process-name"
            type="text"
            value={name}
            maxLength={PROCESS_NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Accounts"
            className={`form-input ${errors.name ? "form-input-error" : ""}`}
            autoFocus
          />
          {errors.name && (
            <p className="form-error" role="alert">{errors.name}</p>
          )}
        </div>

        <div className="details-grid">
          <div>
            <label htmlFor="process-order" className="form-label">Dropdown Order</label>
            <input
              id="process-order"
              type="number"
              min={0}
              max={9999}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder={isEdit ? "" : "Last"}
              className={`form-input ${errors.sortOrder ? "form-input-error" : ""}`}
            />
            {errors.sortOrder && (
              <p className="form-error" role="alert">{errors.sortOrder}</p>
            )}
          </div>
          {isEdit && (
            <div>
              <label htmlFor="process-status" className="form-label">Status</label>
              <select
                id="process-status"
                value={isActive ? "active" : "inactive"}
                onChange={(e) => setIsActive(e.target.value === "active")}
                className="form-input"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}
        </div>
        <p className="form-hint">
          Smaller order number comes first in the ticket form.
          {isEdit && " Inactive processes are hidden from new tickets; old tickets keep them."}
        </p>

        {submitError && (
          <p className="alert-error" role="alert">{submitError}</p>
        )}
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn-submit">
          {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add Process"}
        </button>
      </div>
    </form>
  );
}
