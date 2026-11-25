"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth, useRequireAuth } from "@/components/AuthProvider";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { TrashIcon } from "@/components/Icons";
import Modal from "@/components/Modal";
import RoleForm from "@/components/RoleForm";
import { errorMessage } from "@/lib/apiClient";
import { deleteRole, listPermissions, listRoles } from "@/lib/userApi";
import { Permission, Role } from "@/types/role";

export default function RolesView() {
  const me = useRequireAuth("user.manage");
  const { refresh } = useAuth();

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState<Role | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  const closeAdd = useCallback(() => setIsAddOpen(false), []);
  const closeEdit = useCallback(() => setEditing(null), []);
  const closeDelete = useCallback(() => setDeleting(null), []);

  useEffect(() => {
    if (!me) return;
    let isActive = true;
    Promise.all([listRoles(), listPermissions()])
      .then(([roleData, permData]) => {
        if (!isActive) return;
        setRoles(roleData);
        setPermissions(permData);
      })
      .catch((error) => isActive && setErrorText(errorMessage(error, "Failed to load roles.")))
      .finally(() => isActive && setIsLoading(false));
    return () => {
      isActive = false;
    };
  }, [me]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => {
      setSuccessMessage("");
      setHighlightId(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  if (!me) return <p className="reply-empty">Loading...</p>;

  async function reload(message: string, highlight: number | null) {
    setIsAddOpen(false);
    setEditing(null);
    setDeleting(null);
    setHighlightId(highlight);
    setSuccessMessage(message);
    try {
      setRoles(await listRoles());
    } catch {}
    refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    await deleteRole(deleting.id);
    reload(`Role "${deleting.name}" deleted.`, null);
  }

  const describe = (code: string) =>
    permissions.find((p) => p.code === code)?.description ?? code;

  return (
    <div className="page-wrapper">
      <div className="page-head">
        <div>
          <h2 className="page-title">Roles</h2>
          <p className="page-subtitle">Add roles and choose what each role can do.</p>
        </div>
        <button type="button" onClick={() => setIsAddOpen(true)} className="btn-primary">
          Add role
        </button>
      </div>

      {successMessage && <p className="alert-success" role="status">{successMessage}</p>}
      {errorText && <p className="alert-error" role="alert">{errorText}</p>}

      <div className="table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Description</th>
                <th>Can Assign Tickets</th>
                <th>Can Be Assigned</th>
                <th>Permissions</th>
                <th>Users</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="table-empty">Loading roles...</td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.id} className={role.id === highlightId ? "row-highlight" : ""}>
                    <td className="cell-nowrap">
                      {role.name}
                      {role.isSystem && <div className="cell-sub">System role (fixed)</div>}
                    </td>
                    <td>{role.description || <span className="text-muted-cell">—</span>}</td>
                    <td>
                      <span className={`badge ${role.permissions.includes("ticket.assign") ? "badge-resolved" : "badge-closed"}`}>
                        {role.permissions.includes("ticket.assign") ? "Yes" : "No"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${role.permissions.includes("ticket.view_assigned") ? "badge-resolved" : "badge-closed"}`}>
                        {role.permissions.includes("ticket.view_assigned") ? "Yes" : "No"}
                      </span>
                    </td>
                    <td>
                      <span title={role.permissions.map(describe).join("\n")}>
                        {role.permissions.length} of {permissions.length}
                      </span>
                    </td>
                    <td>{role.userCount}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          onClick={() => setEditing(role)}
                          className="btn-close-ticket"
                        >
                          Edit
                        </button>
                        {!role.isSystem && (
                          <button
                            type="button"
                            onClick={() => setDeleting(role)}
                            className="btn-icon-danger"
                            aria-label={`Delete role ${role.name}`}
                            title="Delete"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isAddOpen} title="Add Role" onClose={closeAdd}>
        <RoleForm
          permissions={permissions}
          onSaved={(r) => reload(`Role "${r.name}" added successfully.`, r.id)}
          onCancel={closeAdd}
        />
      </Modal>

      <Modal isOpen={editing !== null} title="Edit Role" onClose={closeEdit}>
        {editing && (
          <RoleForm
            key={editing.id}
            role={editing}
            permissions={permissions}
            onSaved={(r) => reload(`Role "${r.name}" updated successfully.`, r.id)}
            onCancel={closeEdit}
          />
        )}
      </Modal>

      <ConfirmDeleteDialog
        isOpen={deleting !== null}
        title="Delete Role"
        message={
          deleting && (
            <>
              Are you sure you want to delete the role <strong>{deleting.name}</strong>? A role
              can only be deleted when no active or inactive user has it.
            </>
          )
        }
        onConfirm={handleDelete}
        onClose={closeDelete}
      />
    </div>
  );
}
