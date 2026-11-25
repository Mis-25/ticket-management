import { randomUUID } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { pool, withTransaction } from "@/lib/db";
import { badRequest, forbidden, notFound } from "@/lib/httpError";
import { canViewTicket, getTicketPermissions } from "@/lib/ticketRules";
import {
  getVisibleTicketRow,
  logActivity,
  ticketAccess,
} from "@/services/ticketService";
import { codeToStatus, TicketAttachment } from "@/types/ticket";
import { SessionUser } from "@/types/user";

const STORAGE_DIR = path.join(process.cwd(), "storage", "attachments");

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
};

export const ALLOWED_ATTACHMENT_TYPES = Object.keys(ALLOWED_TYPES);

interface AttachmentRow {
  id: number;
  ticket_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: Date;
  user_id: number;
  user_name: string;
}

const ATTACHMENT_SELECT = `
  SELECT a.id, a.ticket_id, a.file_name, a.file_path, a.file_type, a.file_size,
         a.created_at, u.id AS user_id, u.name AS user_name
  FROM ticket_attachments a
  JOIN users u ON u.id = a.uploaded_by`;

function toAttachment(row: AttachmentRow): TicketAttachment {
  return {
    id: row.id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    createdAt: row.created_at.toISOString(),
    uploadedBy: { id: row.user_id, name: row.user_name },
  };
}

function safeFileName(name: string): string {
  const base = path.basename(name).replace(/[^\w.\- ()]/g, "_").trim();
  return (base || "file").slice(0, 200);
}

export async function listAttachments(
  user: SessionUser,
  ticketId: string
): Promise<TicketAttachment[]> {
  const ticket = await getVisibleTicketRow(user, ticketId);
  const result = await pool.query<AttachmentRow>(
    `${ATTACHMENT_SELECT} WHERE a.ticket_id = $1 ORDER BY a.created_at ASC, a.id ASC`,
    [ticket.id]
  );
  return result.rows.map(toAttachment);
}

export async function uploadAttachment(
  user: SessionUser,
  ticketId: string,
  file: File
): Promise<TicketAttachment> {
  const ticket = await getVisibleTicketRow(user, ticketId);
  if (!getTicketPermissions(user, ticketAccess(ticket)).upload) {
    throw forbidden("You cannot upload files to this ticket.");
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    throw badRequest("This file type is not allowed.", {
      file: "Allowed: images, PDF, TXT, CSV, Word, Excel.",
    });
  }
  if (file.size === 0) throw badRequest("File is empty.", { file: "File is empty." });
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw badRequest("File is too large.", { file: "Maximum size is 5 MB." });
  }

  const storedName = `${randomUUID()}${extension}`;
  const fullPath = path.join(STORAGE_DIR, storedName);
  await mkdir(STORAGE_DIR, { recursive: true });
  await writeFile(fullPath, Buffer.from(await file.arrayBuffer()));

  try {
    return await withTransaction(async (client) => {
      const fileName = safeFileName(file.name);
      const inserted = await client.query<{ id: number }>(
        `INSERT INTO ticket_attachments
           (ticket_id, uploaded_by, file_name, file_path, file_type, file_size)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [ticket.id, user.id, fileName, storedName, file.type, file.size]
      );
      await logActivity(client, {
        ticketId: ticket.id,
        userId: user.id,
        actionType: "Attachment Uploaded",
        newValue: fileName,
      });
      await client.query("UPDATE tickets SET updated_at = NOW() WHERE id = $1", [
        ticket.id,
      ]);
      const saved = await client.query<AttachmentRow>(
        `${ATTACHMENT_SELECT} WHERE a.id = $1`,
        [inserted.rows[0].id]
      );
      return toAttachment(saved.rows[0]);
    });
  } catch (error) {
    await unlink(fullPath).catch(() => {});
    throw error;
  }
}

export async function readAttachment(
  user: SessionUser,
  attachmentId: number
): Promise<{ attachment: TicketAttachment; data: Buffer }> {
  const result = await pool.query<
    AttachmentRow & {
      status: number;
      created_by: number | null;
      assigned_to: number | null;
      manager_id: number | null;
    }
  >(
    `SELECT a.id, a.ticket_id, a.file_name, a.file_path, a.file_type, a.file_size,
            a.created_at, u.id AS user_id, u.name AS user_name,
            t.status, t.created_by, t.assigned_to, t.manager_id
     FROM ticket_attachments a
     JOIN users u ON u.id = a.uploaded_by
     JOIN tickets t ON t.id = a.ticket_id
     WHERE a.id = $1 AND t.deleted_at IS NULL`,
    [attachmentId]
  );
  const row = result.rows[0];
  if (
    !row ||
    !canViewTicket(user, {
      status: codeToStatus(row.status),
      createdById: row.created_by,
      assignedToId: row.assigned_to,
      managerId: row.manager_id,
    })
  ) {
    throw notFound("File not found.");
  }

  const fullPath = path.join(STORAGE_DIR, path.basename(row.file_path));
  const data = await readFile(fullPath).catch(() => {
    throw notFound("File not found.");
  });
  return { attachment: toAttachment(row), data };
}
