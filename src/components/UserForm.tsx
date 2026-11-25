"use client";

import { useState } from "react";
import { ApiError, errorMessage } from "@/lib/apiClient";
import { createUser } from "@/lib/userApi";
import { useRoles } from "@/lib/useRoles";
import {
  CreateUserInput,
  RoleId,
  User,
  USER_LIMITS,
  UserErrors,
  validateUser,
} from "@/types/user";

interface UserFormProps {
  onCreated: (user: User) => void;
  onCancel: () => void;
}

const EMPTY_FORM: CreateUserInput = {
  name: "",
  email: "",
  phoneNumber: "",
  roleId: 0,
};

export default function UserForm({ onCreated, onCancel }: UserFormProps) {
  const [form, setForm] = useState<CreateUserInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<UserErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { roles, rolesError } = useRoles();

  function updateField<K extends keyof CreateUserInput>(field: K, value: CreateUserInput[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    const validationErrors = validateUser(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const user = await createUser(form);
      setForm(EMPTY_FORM);
      onCreated(user);
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setErrors(error.fields);
      } else {
        setSubmitError(errorMessage(error, "Could not add user."));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = (field: keyof UserErrors) =>
    `form-input ${errors[field] ? "form-input-error" : ""}`;

  const errorFor = (field: keyof UserErrors) =>
    errors[field] && (
      <p className="form-error" role="alert">
        {errors[field]}
      </p>
    );

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-fields">
        <div>
          <label htmlFor="user-name" className="form-label">Name</label>
          <input
            id="user-name"
            type="text"
            value={form.name}
            maxLength={USER_LIMITS.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="e.g. Rahul Sharma"
            className={inputClass("name")}
          />
          {errorFor("name")}
        </div>

        <div>
          <label htmlFor="user-email" className="form-label">Email</label>
          <input
            id="user-email"
            type="email"
            value={form.email}
            maxLength={USER_LIMITS.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="name@example.com"
            className={inputClass("email")}
          />
          {errorFor("email")}
        </div>

        <div>
          <label htmlFor="user-phone" className="form-label">Phone Number</label>
          <input
            id="user-phone"
            type="tel"
            value={form.phoneNumber}
            maxLength={USER_LIMITS.phoneNumber}
            onChange={(e) => updateField("phoneNumber", e.target.value)}
            placeholder="9876543210"
            className={inputClass("phoneNumber")}
          />
          {errorFor("phoneNumber")}
        </div>

        <div>
          <label htmlFor="user-role" className="form-label">Role</label>
          <select
            id="user-role"
            value={form.roleId}
            onChange={(e) => updateField("roleId", Number(e.target.value) as RoleId)}
            className={inputClass("roleId")}
          >
            <option value={0}>Select role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          {errorFor("roleId")}
          {rolesError && (
            <p className="form-error" role="alert">{rolesError}</p>
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
          {isSubmitting ? "Saving..." : "Save User"}
        </button>
      </div>
    </form>
  );
}
