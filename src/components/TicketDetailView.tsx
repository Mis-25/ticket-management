"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import ActivityTimeline from "@/components/ActivityTimeline";
import { useRequireAuth } from "@/components/AuthProvider";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import Modal from "@/components/Modal";
import TicketActionForm, { getActionConfig } from "@/components/TicketActionForm";
import { ApiError, errorMessage } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/format";
import {
  attachmentUrl,
  getTicket,
  listActivity,
  listAttachments,
  listReplies,
  sendReply,
  uploadAttachment,
} from "@/lib/ticketApi";
import {
  CommentType,
  REPLY_MESSAGE_LIMIT,
  ReplyErrors,
  TicketReply,
  validateReply,
} from "@/types/reply";
import {
  ActivityEntry,
  TicketAction,
  TicketAttachment,
  TicketDetail,
} from "@/types/ticket";

const MAX_UPLOAD_MB = 5;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function fetchTicketData(ticketId: string) {
  const detail = await getTicket(ticketId);
  const [replies, attachments, activity] = await Promise.all([
    listReplies(ticketId),
    listAttachments(ticketId),
    detail.can.viewHistory ? listActivity(ticketId) : Promise.resolve([]),
  ]);
  return { detail, replies, attachments, activity };
}

const ACTION_ORDER: { action: TicketAction; style: string }[] = [
  { action: "assign", style: "btn-submit" },
  { action: "unassign", style: "btn-secondary" },
  { action: "start", style: "btn-submit" },
  { action: "hold", style: "btn-warning" },
  { action: "resolve", style: "btn-success" },
  { action: "close", style: "btn-secondary" },
  { action: "reopen", style: "btn-danger" },
];

export default function TicketDetailView() {
  const user = useRequireAuth();
  const params = useParams<{ id: string }>();
  const ticketId = decodeURIComponent(params.id);

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");

  const [activeAction, setActiveAction] = useState<TicketAction | null>(null);

  const [message, setMessage] = useState("");
  const [commentType, setCommentType] = useState<CommentType>("public");
  const [replyErrors, setReplyErrors] = useState<ReplyErrors>({});
  const [replyError, setReplyError] = useState("");
  const [isSending, setIsSending] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const closeAction = useCallback(() => setActiveAction(null), []);

  const reloadAll = useCallback(async () => {
    const data = await fetchTicketData(ticketId);
    setTicket(data.detail);
    setReplies(data.replies);
    setAttachments(data.attachments);
    setActivity(data.activity);
  }, [ticketId]);

  useEffect(() => {
    if (!user) return;
    let isActive = true;

    async function load() {
      try {
        const data = await fetchTicketData(ticketId);
        if (!isActive) return;
        setTicket(data.detail);
        setReplies(data.replies);
        setAttachments(data.attachments);
        setActivity(data.activity);
      } catch (error) {
        if (isActive) {
          setLoadError(
            error instanceof ApiError && error.status === 404
              ? "Ticket not found, or you do not have access to it."
              : errorMessage(error, "Failed to load ticket.")
          );
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    load();
    return () => {
      isActive = false;
    };
  }, [user, ticketId]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const backLink = (
    <Link href="/tickets" className="back-link">
      ← Back to Tickets
    </Link>
  );

  if (!user || isLoading) {
    return (
      <div className="page-wrapper">
        {backLink}
        <p className="reply-empty">Loading ticket...</p>
      </div>
    );
  }

  if (loadError || !ticket) {
    return (
      <div className="page-wrapper">
        {backLink}
        <p className="alert-error" role="alert">{loadError || "Ticket not found."}</p>
      </div>
    );
  }

  const can = ticket.can;
  const availableActions = ACTION_ORDER.filter(({ action }) => can[action]);
  const canWrite = can.reply || can.internalNote;
  const replyType: CommentType = !can.internalNote
    ? "public"
    : !can.reply
      ? "internal"
      : commentType;

  async function handleActionDone(updated: TicketDetail) {
    const label = getActionConfig(activeAction!, ticket!).title;
    setActiveAction(null);
    setTicket(updated);
    setNotice(`${label}: done. Status is now "${updated.status}".`);
    await reloadAll().catch(() => {});
  }

  async function handleReply(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setReplyError("");
    const input = { message, commentType: replyType };
    const errors = validateReply(input);
    setReplyErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSending(true);
    try {
      await sendReply(ticketId, input);
      setMessage("");
      await reloadAll();
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length) setReplyErrors(error.fields);
      else setReplyError(errorMessage(error, "Could not send."));
    } finally {
      setIsSending(false);
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadError("");
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setUploadError(`File is too large. Maximum size is ${MAX_UPLOAD_MB} MB.`);
      return;
    }
    setIsUploading(true);
    try {
      await uploadAttachment(ticketId, file);
      await reloadAll();
    } catch (error) {
      setUploadError(
        error instanceof ApiError && error.fields.file
          ? error.fields.file
          : errorMessage(error, "Upload failed.")
      );
    } finally {
      setIsUploading(false);
    }
  }

  const info: { label: string; value: React.ReactNode }[] = [
    { label: "Ticket ID", value: ticket.id },
    { label: "Status", value: <StatusBadge status={ticket.status} /> },
    { label: "Priority", value: <PriorityBadge priority={ticket.priority} /> },
    { label: "Process", value: ticket.process?.name ?? "—" },
    { label: "Raised By", value: ticket.createdBy?.name ?? "—" },
    { label: "Assigning Manager", value: ticket.manager?.name ?? "—" },
    {
      label: "Assigned To",
      value: ticket.assignedTo
        ? `${ticket.assignedTo.name}${ticket.assignedAt ? ` (since ${formatDateTime(ticket.assignedAt)})` : ""}`
        : "Unassigned",
    },
    { label: "Created At", value: formatDateTime(ticket.createdAt) },
    { label: "Last Updated", value: formatDateTime(ticket.updatedAt) },
  ];
  if (ticket.resolvedAt) info.push({ label: "Resolved", value: formatDateTime(ticket.resolvedAt) });
  if (ticket.closedAt) info.push({ label: "Closed", value: formatDateTime(ticket.closedAt) });
  if (ticket.reopenedAt) info.push({ label: "Reopened", value: formatDateTime(ticket.reopenedAt) });

  return (
    <div className="page-wrapper">
      {backLink}

      <div className="page-head">
        <div>
          <p className="ticket-number">{ticket.id}</p>
          <h2 className="page-title">{ticket.title}</h2>
        </div>
        <StatusBadge status={ticket.status} />
      </div>

      {notice && <p className="alert-success" role="status">{notice}</p>}

      {availableActions.length > 0 && (
        <section className="action-bar" aria-label="Ticket actions">
          {availableActions.map(({ action, style }) => (
            <button
              key={action}
              type="button"
              onClick={() => setActiveAction(action)}
              className={style}
            >
              {getActionConfig(action, ticket).submitLabel}
            </button>
          ))}
        </section>
      )}

      {ticket.status === "Resolved" && (can.reopen || (can.close && !can.closeNeedsReason)) && (
        <p className="alert-info">
          Support has marked this ticket as resolved. Please review the resolution
          notes, then <strong>Confirm &amp; Close</strong> it, or <strong>Reopen</strong> it
          if the issue is not solved.
        </p>
      )}

      <section className="reply-card">
        <h3 className="reply-heading">Ticket Details</h3>
        <dl className="info-grid">
          {info.map((item) => (
            <div key={item.label} className="info-item">
              <dt className="detail-label">{item.label}</dt>
              <dd className="detail-value">{item.value}</dd>
            </div>
          ))}
        </dl>
        <div>
          <p className="detail-label">Description</p>
          <div className="detail-box detail-value detail-description">{ticket.description}</div>
        </div>
        {ticket.resolutionNote && (
          <div>
            <p className="detail-label">
              {ticket.status === "Resolved" || ticket.status === "Closed"
                ? "Resolution Notes"
                : "Previous Resolution Notes"}
            </p>
            <div className="resolution-box detail-description">{ticket.resolutionNote}</div>
          </div>
        )}
      </section>

      <section className="reply-card">
        <h3 className="reply-heading">
          Conversation <span className="reply-count">({replies.length})</span>
        </h3>

        {replies.length === 0 ? (
          <p className="reply-empty">No replies yet.</p>
        ) : (
          <ul className="reply-list">
            {replies.map((reply) => (
              <li
                key={reply.id}
                className={`reply-item ${reply.commentType === "internal" ? "reply-internal" : ""}`}
              >
                <div className="reply-item-head">
                  <p className="reply-author">
                    {reply.user.name} <span className="reply-role">· {reply.user.roleName}</span>
                  </p>
                  <p className="reply-date">{formatDateTime(reply.createdAt)}</p>
                </div>
                {reply.commentType === "internal" && (
                  <p className="internal-tag">Internal note — not visible to employee</p>
                )}
                <p className="reply-message">{reply.message}</p>
              </li>
            ))}
          </ul>
        )}

        {ticket.status === "Closed" && (
          <p className="alert-info">
            This ticket is closed, so replies are disabled. The full conversation is kept.
            {can.reopen && " If the problem happens again, use Reopen Ticket."}
          </p>
        )}

        {canWrite && (
          <form onSubmit={handleReply} noValidate className="reply-form">
            {can.internalNote && (
              <div className="segmented" role="radiogroup" aria-label="Reply type">
                {can.reply && (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={replyType === "public"}
                    onClick={() => setCommentType("public")}
                    className={`segmented-option ${replyType === "public" ? "segmented-active" : ""}`}
                  >
                    Public reply
                  </button>
                )}
                <button
                  type="button"
                  role="radio"
                  aria-checked={replyType === "internal"}
                  onClick={() => setCommentType("internal")}
                  className={`segmented-option ${replyType === "internal" ? "segmented-active" : ""}`}
                >
                  Internal note
                </button>
              </div>
            )}
            <div>
              <label htmlFor="reply-message" className="form-label">
                {replyType === "internal" ? "Internal note (staff only)" : "Your reply"}
              </label>
              <textarea
                id="reply-message"
                rows={4}
                value={message}
                maxLength={REPLY_MESSAGE_LIMIT}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={replyType === "internal" ? "Visible only to Admin and Support Agents..." : "Type your reply..."}
                className={`form-input ${replyErrors.message ? "form-input-error" : ""}`}
              />
              {replyErrors.message && <p className="form-error" role="alert">{replyErrors.message}</p>}
            </div>
            {replyError && <p className="alert-error" role="alert">{replyError}</p>}
            <div className="form-actions">
              <button type="submit" disabled={isSending} className="btn-submit">
                {isSending ? "Sending..." : replyType === "internal" ? "Add Internal Note" : "Send Reply"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="reply-card">
        <div className="section-head">
          <h3 className="reply-heading">
            Attachments <span className="reply-count">({attachments.length})</span>
          </h3>
          {can.upload && (
            <>
              <input
                ref={fileInput}
                type="file"
                onChange={handleUpload}
                className="sr-only"
                id="attachment-input"
                accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx"
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={isUploading}
                className="btn-small"
              >
                {isUploading ? "Uploading..." : "+ Upload file"}
              </button>
            </>
          )}
        </div>
        {uploadError && <p className="alert-error" role="alert">{uploadError}</p>}
        {attachments.length === 0 ? (
          <p className="reply-empty">No attachments.</p>
        ) : (
          <ul className="attachment-list">
            {attachments.map((file) => (
              <li key={file.id} className="attachment-item">
                <a href={attachmentUrl(file.id)} className="inline-link">
                  {file.fileName}
                </a>
                <span className="reply-date">
                  {formatSize(file.fileSize)} · {file.uploadedBy.name} · {formatDateTime(file.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {can.upload && (
          <p className="form-hint">Images, PDF, TXT, CSV, Word, Excel — max {MAX_UPLOAD_MB} MB.</p>
        )}
      </section>

      {can.viewHistory && (
        <section className="reply-card">
          <h3 className="reply-heading">Status History &amp; Activity</h3>
          <ActivityTimeline entries={activity} />
        </section>
      )}

      <Modal
        isOpen={activeAction !== null}
        title={activeAction ? getActionConfig(activeAction, ticket).title : ""}
        onClose={closeAction}
      >
        {activeAction && (
          <TicketActionForm
            key={activeAction}
            ticket={ticket}
            action={activeAction}
            onDone={handleActionDone}
            onCancel={closeAction}
          />
        )}
      </Modal>
    </div>
  );
}
