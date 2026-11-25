"use client";

import { ReactNode, useState } from "react";
import Modal from "@/components/Modal";
import { errorMessage } from "@/lib/apiClient";

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export default function ConfirmDeleteDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onClose,
}: ConfirmDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorText, setErrorText] = useState("");

  function close() {
    if (isDeleting) return;
    setErrorText("");
    onClose();
  }

  async function handleDelete() {
    setIsDeleting(true);
    setErrorText("");
    try {
      await onConfirm();
    } catch (error) {
      setErrorText(errorMessage(error, "Could not delete. Please try again."));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} title={title} onClose={close}>
      <div className="form-fields">
        <p className="confirm-text">{message}</p>
        {errorText && (
          <p className="alert-error" role="alert">{errorText}</p>
        )}
      </div>
      <div className="form-actions">
        <button type="button" onClick={close} className="btn-secondary">
          Cancel
        </button>
        <button type="button" onClick={handleDelete} disabled={isDeleting} className="btn-danger">
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </Modal>
  );
}
