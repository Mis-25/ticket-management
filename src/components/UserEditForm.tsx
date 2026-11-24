"use client";

import { useState } from "react";
import { ApiError, errorMessage } from "@/lib/apiClient";
import { updateUser } from "@/lib/userApi";
import {
  ROLE_OPTIONS,
  RoleId,
  UpdateUserInput,
  User,
  USER_LIMITS,
  UserErrors,
  UserStatus,
  validateUserUpdate,
} from "@/types/user";

interface UserEditFormProps {
  user: User;
  isSelf: boolean;
  onSaved: (user: User) => void;
  onCancel: () => void;
}

/** Admin: role, status, phone ya naam badle. */
export default function UserEditForm({ user, isSelf, onSaved, onCancel }: UserEditFormProps) {
  const [name, setName] = useState(user.name);
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber);
  const [roleId, setRoleId] = useState<RoleId>(user.roleId);
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [errors, setErrors] = useState<UserErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    const input: UpdateUserInput = { name, phoneNumber, roleId, status };

    const validationErrors = validateUserUpdate(input);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      onSaved(await updateUser(user.id, input));
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setErrors(error.fields);
      } else {
        setSubmitError(errorMessage(error, "Could not update user."));
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
        <p className="form-hint">
          Email: <strong>{user.email}</strong>
        </p>

        <div>
          <label htmlFor="edit-name" className="form-label">Name</label>
          <input
            id="edit-name"
            type="text"
            value={name}
            maxLength={USER_LIMITS.name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass("name")}
          />
          {errorFor("name")}
        </div>

        <div>
          <label htmlFor="edit-phone" className="form-label">Phone Number</label>
          <input
            id="edit-phone"
            type="tel"
            value={phoneNumber}
            maxLength={USER_LIMITS.phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className={inputClass("phoneNumber")}
          />
          {errorFor("phoneNumber")}
        </div>

        <div className="details-grid">
          <div>
            <label htmlFor="edit-role" className="form-label">Role</label>
            <select
              id="edit-role"
              value={roleId}
              disabled={isSelf}
              onChange={(e) => setRoleId(Number(e.target.value) as RoleId)}
              className={inputClass("roleId")}
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            {errorFor("roleId")}
          </div>
          <div>
            <label htmlFor="edit-status" className="form-label">Status</label>
            <select
              id="edit-status"
              value={status}
              disabled={isSelf}
              onChange={(e) => setStatus(e.target.value as UserStatus)}
              className="form-input"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        {isSelf && (
          <p className="form-hint">You cannot change your own role or status.</p>
        )}

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
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
