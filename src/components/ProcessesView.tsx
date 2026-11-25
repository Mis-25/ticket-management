"use client";

import { useCallback, useEffect, useState } from "react";
import { useRequireAuth } from "@/components/AuthProvider";
import Modal from "@/components/Modal";
import ProcessForm from "@/components/ProcessForm";
import { errorMessage } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/format";
import { deleteProcess, listAllProcesses } from "@/lib/ticketApi";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { TrashIcon } from "@/components/Icons";
import { ProcessRow } from "@/types/ticket";

export default function ProcessesView() {
  const me = useRequireAuth("process.manage");

  const [processes, setProcesses] = useState<ProcessRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<ProcessRow | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  const closeAdd = useCallback(() => setIsAddOpen(false), []);
  const closeEdit = useCallback(() => setEditing(null), []);
  const [deleting, setDeleting] = useState<ProcessRow | null>(null);
  const closeDelete = useCallback(() => setDeleting(null), []);

  useEffect(() => {
    if (!me) return;
    let isActive = true;
    listAllProcesses()
      .then((data) => isActive && setProcesses(data))
      .catch((error) => isActive && setErrorText(errorMessage(error, "Failed to load processes.")))
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

  async function reloadAfterSave(process: ProcessRow, message: string) {
    setIsAddOpen(false);
    setEditing(null);
    setHighlightId(process.id);
    setSuccessMessage(message);
    try {
      setProcesses(await listAllProcesses());
    } catch {}
  }

  async function handleDelete() {
    if (!deleting) return;
    await deleteProcess(deleting.id);
    setSuccessMessage(`Process "${deleting.name}" deleted.`);
    setDeleting(null);
    try {
      setProcesses(await listAllProcesses());
    } catch {}
  }

  const activeCount = processes.filter((p) => p.isActive).length;

  return (
    <div className="page-wrapper">
      <div className="page-head">
        <div>
          <h2 className="page-title">Processes</h2>
          <p className="page-subtitle">Company processes shown in the Create Ticket form.</p>
        </div>
        <button type="button" onClick={() => setIsAddOpen(true)} className="btn-primary">
          Add process
        </button>
      </div>

      {successMessage && (
        <p className="alert-success" role="status">{successMessage}</p>
      )}

      <section className="stat-grid-4">
        <div className="stat-card">
          <p className="stat-label">Total Processes</p>
          <p className="stat-value">{processes.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Active</p>
          <p className="stat-value-brand">{activeCount}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Inactive</p>
          <p className="stat-value">{processes.length - activeCount}</p>
        </div>
      </section>

      <section>
        {errorText && (
          <p className="alert-error" role="alert">{errorText}</p>
        )}

        <div className="table-card">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Process Name</th>
                  <th>Status</th>
                  <th>Tickets</th>
                  <th>Created At</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="table-empty">Loading processes...</td>
                  </tr>
                ) : processes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="table-empty">
                      No processes yet. Click &quot;Add process&quot; to create the first one.
                    </td>
                  </tr>
                ) : (
                  processes.map((process) => (
                    <tr key={process.id} className={process.id === highlightId ? "row-highlight" : ""}>
                      <td>{process.sortOrder}</td>
                      <td>{process.name}</td>
                      <td>
                        <span className={`badge ${process.isActive ? "badge-resolved" : "badge-closed"}`}>
                          {process.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{process.ticketCount}</td>
                      <td className="cell-nowrap">{formatDateTime(process.createdAt)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            onClick={() => setEditing(process)}
                            className="btn-close-ticket"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(process)}
                            className="btn-icon-danger"
                            aria-label={`Delete process ${process.name}`}
                            title="Delete"
                          >
                            <TrashIcon />
                          </button>
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
        isOpen={deleting !== null}
        title="Delete Process"
        message={
          deleting && (
            <>
              Are you sure you want to delete the process <strong>{deleting.name}</strong>? It
              will be removed from the Create Ticket form.
              {deleting.ticketCount > 0 &&
                ` Its ${deleting.ticketCount} old ticket(s) will still show this process name.`}
            </>
          )
        }
        onConfirm={handleDelete}
        onClose={closeDelete}
      />

      <Modal isOpen={isAddOpen} title="Add Process" onClose={closeAdd}>
        <ProcessForm
          onSaved={(p) => reloadAfterSave(p, `Process "${p.name}" added successfully.`)}
          onCancel={closeAdd}
        />
      </Modal>

      <Modal isOpen={editing !== null} title="Edit Process" onClose={closeEdit}>
        {editing && (
          <ProcessForm
            key={editing.id}
            process={editing}
            onSaved={(p) => reloadAfterSave(p, `Process "${p.name}" updated successfully.`)}
            onCancel={closeEdit}
          />
        )}
      </Modal>
    </div>
  );
}
