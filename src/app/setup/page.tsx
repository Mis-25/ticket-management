"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ApiError, errorMessage } from "@/lib/apiClient";
import { createFirstAdmin } from "@/lib/userApi";
import { ROLES, USER_LIMITS, UserErrors, validateUser } from "@/types/user";

const EMPTY = { name: "", email: "", phoneNumber: "" };

/**
 * Sirf pehli baar: jab database me koi Admin nahi hai.
 * Admin ban jaane ke baad app seedha Tickets dashboard kholti hai.
 */
export default function SetupPage() {
  const router = useRouter();
  const { user, isLoading, refresh } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<UserErrors>({});
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace("/tickets");
  }, [isLoading, user, router]);

  async function handleCreateAdmin(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const validation = validateUser({ ...form, roleId: ROLES.ADMIN });
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setIsCreating(true);
    try {
      await createFirstAdmin(form);
      await refresh();
      router.replace("/tickets");
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) setErrors(err.fields);
      else setError(errorMessage(err, "Could not create Admin."));
    } finally {
      setIsCreating(false);
    }
  }

  const field = (id: keyof typeof EMPTY, label: string, type: string, maxLength: number) => (
    <div>
      <label htmlFor={`admin-${id}`} className="form-label">{label}</label>
      <input
        id={`admin-${id}`}
        type={type}
        value={form[id]}
        maxLength={maxLength}
        onChange={(e) => setForm((prev) => ({ ...prev, [id]: e.target.value }))}
        className={`form-input ${errors[id] ? "form-input-error" : ""}`}
      />
      {errors[id] && <p className="form-error" role="alert">{errors[id]}</p>}
    </div>
  );

  if (isLoading || user) return <p className="reply-empty">Loading...</p>;

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2 className="page-title">Create Admin</h2>
        <p className="auth-subtitle">
          One-time setup. The Admin manages tickets and users. If the email already
          exists, that user becomes the Admin.
        </p>

        {error && <p className="alert-error" role="alert">{error}</p>}

        <form onSubmit={handleCreateAdmin} noValidate>
          <div className="form-fields">
            {field("name", "Name", "text", USER_LIMITS.name)}
            {field("email", "Email", "email", USER_LIMITS.email)}
            {field("phoneNumber", "Phone Number", "tel", USER_LIMITS.phoneNumber)}
            <button type="submit" disabled={isCreating} className="btn-submit btn-block">
              {isCreating ? "Creating..." : "Create Admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
