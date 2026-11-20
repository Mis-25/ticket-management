"use client";

import { useState } from "react";
import { CreateTicketInput } from "@/types/ticket";

interface TicketFormProps {
  onCreate: (input: CreateTicketInput) => Promise<void>;
  onCancel: () => void;
}

interface FormErrors {
  title?: string;
  description?: string;
}

export default function TicketForm({ onCreate, onCancel }: TicketFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): FormErrors {
    const newErrors: FormErrors = {};

    if (title.trim() === "") {
      newErrors.title = "Title is required. Please enter a ticket title.";
    }
    if (description.trim() === "") {
      newErrors.description =
        "Description is required. Please describe the issue.";
    }

    return newErrors;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate({ title, description });

      setTitle("");
      setDescription("");
      setErrors({});
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputBase =
    "mt-1 w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2";

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-slate-700"
          >
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Login Issue"
            className={`${inputBase} ${
              errors.title
                ? "border-red-400 focus:ring-red-200"
                : "border-slate-300 focus:border-blue-500 focus:ring-blue-200"
            }`}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {errors.title}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-slate-700"
          >
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain the problem in detail..."
            className={`${inputBase} ${
              errors.description
                ? "border-red-400 focus:ring-red-200"
                : "border-slate-300 focus:border-blue-500 focus:ring-blue-200"
            }`}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {errors.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Creating..." : "Create Ticket"}
        </button>
      </div>
    </form>
  );
}