"use client";

import { useState } from "react";
import { ApiError, errorMessage } from "@/lib/apiClient";
import { createRole, updateRole } from "@/lib/userApi";
import {
  guessSuggestionType,
  Permission,
  PERMISSION_GROUPS,
  Role,
  ROLE_LIMITS,
  RoleErrors,
  RoleInput,
  validateRole,
} from "@/types/role";

interface RoleFormProps {
  role?: Role;
  permissions: Permission[];
  onSaved: (role: Role) => void;
  onCancel: () => void;
}

export default function RoleForm({ role, permissions, onSaved, onCancel }: RoleFormProps) {
  const isEdit = role !== undefined;
  const isLocked = role?.isSystem ?? false;
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [selected, setSelected] = useState<string[]>(role?.permissions ?? []);
  const [errors, setErrors] = useState<RoleErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickedSuggestion, setPickedSuggestion] = useState<string | null>(null);

  const known = new Set(PERMISSION_GROUPS.flatMap((g) => g.codes));
  const groups = [
    ...PERMISSION_GROUPS.map((g) => ({
      title: g.title,
      items: g.codes
        .map((code) => permissions.find((p) => p.code === code))
        .filter((p): p is Permission => p !== undefined),
    })),
    { title: "Other", items: permissions.filter((p) => !known.has(p.code)) },
  ].filter((g) => g.items.length > 0);

  const suggestionTypes = [...new Set(permissions.flatMap((p) => p.recommendedFor))];
  const suggestFor = pickedSuggestion ?? guessSuggestionType(name, suggestionTypes);
  const recommendedCodes = permissions
    .filter((p) => p.recommendedFor.includes(suggestFor))
    .map((p) => p.code);
  const missing = recommendedCodes.filter((c) => !selected.includes(c)).length;
  const extra = selected.filter((c) => suggestFor && !recommendedCodes.includes(c)).length;

  function toggle(code: string) {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    const input: RoleInput = isLocked
      ? { description: description.trim() }
      : { name: name.trim(), description: description.trim(), permissions: selected };

    const validationErrors = validateRole(input);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      onSaved(isEdit ? await updateRole(role.id, input) : await createRole(input));
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setErrors(error.fields);
      } else {
        setSubmitError(errorMessage(error, "Could not save role."));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-fields">
        <div>
          <label htmlFor="role-name" className="form-label">Role Name</label>
          <input
            id="role-name"
            type="text"
            value={name}
            maxLength={ROLE_LIMITS.name}
            disabled={isLocked}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Manager"
            className={`form-input ${errors.name ? "form-input-error" : ""}`}
            autoFocus={!isLocked}
          />
          {errors.name && <p className="form-error" role="alert">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="role-description" className="form-label">Description</label>
          <input
            id="role-description"
            type="text"
            value={description}
            maxLength={ROLE_LIMITS.description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Assigns tickets to the team"
            className={`form-input ${errors.description ? "form-input-error" : ""}`}
          />
          {errors.description && (
            <p className="form-error" role="alert">{errors.description}</p>
          )}
        </div>

        <div>
          <p className="form-label">What can this role do?</p>
          {isLocked && (
            <p className="form-hint">The Admin role&apos;s permissions are fixed. Only the description can change.</p>
          )}

          {!isLocked && suggestionTypes.length > 0 && (
            <div className="suggest-bar">
              <label htmlFor="role-suggest" className="suggest-label">Suggestions for</label>
              <select
                id="role-suggest"
                value={suggestFor}
                onChange={(e) => setPickedSuggestion(e.target.value)}
                className="suggest-select"
              >
                <option value="">— none —</option>
                {suggestionTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {suggestFor && (
                <button
                  type="button"
                  onClick={() => setSelected(recommendedCodes)}
                  className="btn-small"
                  disabled={missing === 0 && extra === 0}
                >
                  Tick only {suggestFor} permissions
                </button>
              )}
              {suggestFor && (
                <p className="suggest-status">
                  {missing === 0 && extra === 0
                    ? `✓ Matches the suggested permissions for ${suggestFor}.`
                    : [
                        missing > 0 && `${missing} suggested not ticked`,
                        extra > 0 && `${extra} extra ticked`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                </p>
              )}
            </div>
          )}

          {groups.map((group) => (
            <fieldset key={group.title} className="perm-group">
              <legend className="perm-group-title">{group.title}</legend>
              <div className="perm-list">
                {group.items.map((p) => {
                  const isSuggested = suggestFor !== "" && p.recommendedFor.includes(suggestFor);
                  const isChecked = selected.includes(p.code);
                  const isExtra = suggestFor !== "" && isChecked && !isSuggested;
                  return (
                    <label
                      key={p.code}
                      className={`perm-option ${isSuggested ? "perm-option-suggested" : ""} ${
                        isExtra ? "perm-option-extra" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="perm-checkbox"
                        checked={isChecked}
                        disabled={isLocked}
                        onChange={() => toggle(p.code)}
                      />
                      <span>
                        {p.description}
                        {p.recommendedFor.length > 0 && (
                          <span className="perm-for">
                            For:{" "}
                            {p.recommendedFor.map((t, i) => (
                              <span key={t}>
                                {i > 0 && ", "}
                                <span className={t === suggestFor ? "perm-for-match" : ""}>{t}</span>
                              </span>
                            ))}
                          </span>
                        )}
                        {isExtra && (
                          <span className="perm-extra-note">Not usually given to {suggestFor}</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
          {errors.permissions && (
            <p className="form-error" role="alert">{errors.permissions}</p>
          )}
        </div>

        {submitError && <p className="alert-error" role="alert">{submitError}</p>}
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn-submit">
          {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add Role"}
        </button>
      </div>
    </form>
  );
}
