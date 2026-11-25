"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useRequireAuth } from "@/components/AuthProvider";
import Modal from "@/components/Modal";
import UserEditForm from "@/components/UserEditForm";
import UserForm from "@/components/UserForm";
import { errorMessage } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/format";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { TrashIcon } from "@/components/Icons";
import { deleteUser, listUsers } from "@/lib/userApi";
import { useRoles } from "@/lib/useRoles";
import { User } from "@/types/user";

export default function UsersView() {
  const me = useRequireAuth("user.manage");
  const searchParams = useSearchParams();
  const newFromUrl = Number(searchParams.get("new")) || null;

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(newFromUrl);
  const [successMessage, setSuccessMessage] = useState("");

  const closeAdd = useCallback(() => setIsAddOpen(false), []);
  const closeEdit = useCallback(() => setEditingUser(null), []);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const { roles } = useRoles();
  const closeDelete = useCallback(() => setDeletingUser(null), []);

  useEffect(() => {
    if (!me) return;
    let isActive = true;

    async function load() {
      try {
        const data = await listUsers();
        if (!isActive) return;
        setUsers(data);
        const created = data.find((u) => u.id === newFromUrl);
        if (created) {
          setSuccessMessage(`User "${created.name}" added successfully.`);
          window.history.replaceState(null, "", "/users");
        }
      } catch (error) {
        if (isActive) setErrorText(errorMessage(error, "Failed to load users."));
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    load();
    return () => {
      isActive = false;
    };
  }, [me, newFromUrl]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => {
      setSuccessMessage("");
      setHighlightId(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  if (!me) return <p className="reply-empty">Loading...</p>;

  async function reloadAfterSave(user: User, message: string) {
    setHighlightId(user.id);
    setSuccessMessage(message);
    try {
      setUsers(await listUsers());
    } catch {}
  }

  function handleCreated(user: User) {
    setIsAddOpen(false);
    reloadAfterSave(user, `User "${user.name}" added successfully.`);
  }

  function handleSaved(user: User) {
    setEditingUser(null);
    reloadAfterSave(user, `User "${user.name}" updated successfully.`);
  }

  async function handleDeleteUser() {
    if (!deletingUser) return;
    await deleteUser(deletingUser.id);
    setSuccessMessage(`User "${deletingUser.name}" deleted.`);
    setDeletingUser(null);
    try {
      setUsers(await listUsers());
    } catch {}
  }

  const countRole = (role: string) =>
    users.filter((u) => u.roleName === role && u.status === "active").length;

  return (
    <div className="page-wrapper">
      <div className="page-head">
        <div>
          <h2 className="page-title">Users</h2>
          <p className="page-subtitle">Manage users, roles and access.</p>
        </div>
        <button type="button" onClick={() => setIsAddOpen(true)} className="btn-primary">
          Add user
        </button>
      </div>

      {successMessage && (
        <p className="alert-success" role="status">
          {successMessage}
        </p>
      )}

      <section className="stat-grid-4">
        <div className="stat-card">
          <p className="stat-label">Total Users</p>
          <p className="stat-value">{users.length}</p>
        </div>
        {roles.map((role) => (
          <div key={role.id} className="stat-card">
            <p className="stat-label">{role.name}</p>
            <p className="stat-value">{countRole(role.name)}</p>
          </div>
        ))}
      </section>

      <section>
        {errorText && (
          <p className="alert-error" role="alert">
            {errorText}
          </p>
        )}

        <div className="table-card">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone Number</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Replies</th>
                  <th>Created At</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="table-empty">Loading users...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="table-empty">
                      No users yet. Click &quot;Add user&quot; to create the first user.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className={user.id === highlightId ? "row-highlight" : ""}>
                      <td className="cell-nowrap">USR-{user.id}</td>
                      <td>{user.name}</td>
                      <td className="cell-break">{user.email}</td>
                      <td className="cell-nowrap">{user.phoneNumber}</td>
                      <td className="cell-nowrap">{user.roleName}</td>
                      <td>
                        <span className={`badge ${user.status === "active" ? "badge-resolved" : "badge-closed"}`}>
                          {user.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{user.replyCount}</td>
                      <td className="cell-nowrap">{formatDateTime(user.createdAt)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            onClick={() => setEditingUser(user)}
                            className="btn-close-ticket"
                          >
                            Edit
                          </button>
                          {user.id !== me.id && (
                            <button
                              type="button"
                              onClick={() => setDeletingUser(user)}
                              className="btn-icon-danger"
                              aria-label={`Delete user ${user.name}`}
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
      </section>

      <ConfirmDeleteDialog
        isOpen={deletingUser !== null}
        title="Delete User"
        message={
          deletingUser && (
            <>
              Are you sure you want to delete <strong>{deletingUser.name}</strong> (
              {deletingUser.email})? Their old tickets and replies will still show their name.
            </>
          )
        }
        onConfirm={handleDeleteUser}
        onClose={closeDelete}
      />

      <Modal isOpen={isAddOpen} title="Add User" onClose={closeAdd}>
        <UserForm onCreated={handleCreated} onCancel={closeAdd} />
      </Modal>

      <Modal isOpen={editingUser !== null} title="Edit User" onClose={closeEdit}>
        {editingUser && (
          <UserEditForm
            key={editingUser.id}
            user={editingUser}
            isSelf={editingUser.id === me.id}
            onSaved={handleSaved}
            onCancel={closeEdit}
          />
        )}
      </Modal>
    </div>
  );
}
