# Helpdesk Ticket Management System

A helpdesk application with role-based access (Admin, Support Agent, Employee), a full ticket status workflow, comments, attachments and a complete activity history. Built with Next.js (App Router), TypeScript, Tailwind CSS and PostgreSQL.

## Features

- No login or user selection: the app always runs as the Admin and opens straight on the Tickets dashboard
- Three roles with permissions stored in the database (`roles`, `permissions`, `role_permissions`)
- Ticket workflow: Open → Assigned → In Progress ⇄ On Hold → Resolved → Closed → Reopened
- Admin assigns / reassigns tickets to Support Agents (assignment history is kept)
- Public replies and staff-only internal notes; replies are disabled on Closed tickets
- File attachments (images, PDF, TXT, CSV, Word, Excel — max 5 MB)
- Status History & Activity timeline for every action (read-only, protected by a DB trigger)
- Dashboard with live counts per status and filters (status, priority, assignee, created date)
- Users page for Admin: create users, change role / status

## Roles

| Action | Admin | Support Agent | Employee |
| --- | :-: | :-: | :-: |
| See tickets | all | assigned to them | created by them |
| Create ticket | ✓ | | ✓ |
| Assign / reassign | ✓ | | |
| Start work, put On Hold, resume | ✓ | assigned only | |
| Resolve (resolution note required) | ✓ | assigned only | |
| Close a Resolved ticket (confirm) | own tickets | | own tickets |
| Close any ticket (reason required) | ✓ | | |
| Reopen (reason required) | own tickets | | own tickets |
| Public reply (not on Closed) | ✓ | assigned only | own tickets |
| Internal note (hidden from employee) | ✓ | assigned only | |
| Manage users | ✓ | | |

All checks run in the backend API. The frontend only hides buttons the user cannot use.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create the database

In pgAdmin, create a database named `helpdeskdb`.

### 3. Run the migrations (in order)

Open the Query Tool on `helpdeskdb` and run each file from `db/migrations/` in order:

| File | What it does |
| --- | --- |
| `001_create_tickets.sql` | Original `tickets` table |
| `002_ticket_statuses.sql` | Allows the 7 statuses |
| `003_ticket_status_codes.sql` | Stores status as a number (0–6) |
| `004_users_and_replies.sql` | `users` and `ticket_replies` tables |
| `005_roles_status_history.sql` | Roles, permissions, sessions, workflow columns, history tables |

Every migration is safe to run again; it never deletes existing data.

### 4. Configure environment variables

Create a file named `.env.local` in the project root:

```dotenv
DATABASE_URL=postgresql://USERNAME:PASSWORD@localhost:PORT/helpdeskdb
```

- If the password contains special characters, encode them (`@` as `%40`, `#` as `%23`, `/` as `%2F`, `:` as `%3A`).
- Do not use quotes and do not put spaces around `=`.
- Never share or commit `.env.local`.

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Create the first Admin (one time)

The app opens the **Tickets** dashboard directly and always works as the Admin (the first active Admin in the `users` table). There is no user-select screen.

If no Admin exists yet, the app shows a one-time **Create Admin** form at **/setup** (name, email, phone). If the email already belongs to a user, that user becomes the Admin. After that, use **+ Add user** on the Tickets dashboard (or the **Users** page) to add Support Agents and Employees.

> There is no password: anyone who can open the app works as the Admin. Use it only on a trusted network.

## Status Codes

`tickets.status` stores a number:

| Code | Status |
| --- | --- |
| 0 | Open |
| 1 | Assigned |
| 2 | In Progress |
| 3 | On Hold |
| 4 | Resolved |
| 5 | Closed |
| 6 | Reopened |

Do not change the order of `TICKET_STATUSES` in `src/types/ticket.ts`.

## Database Tables

| Table | Purpose |
| --- | --- |
| `tickets` | Tickets (`title` is shown as Subject, `ticket_number` = `TKT-<id>`) |
| `users` | Users with `role_id` and `status` (`password_hash` column exists but is not used) |
| `roles`, `permissions`, `role_permissions` | Role-based access |
| `user_sessions` | Current-user sessions (only a SHA-256 hash of the token is stored) |
| `ticket_replies` | Comments; `comment_type` is `public` or `internal` |
| `ticket_status_history` | Every status change (who, old, new, reason, note) |
| `ticket_assignments` | Every assignment / reassignment |
| `ticket_attachments` | Uploaded file details (files are saved in `storage/attachments/`) |
| `ticket_activity_log` | Transaction / activity history shown on the ticket page |

Every workflow action updates the ticket and writes the history rows in one database transaction (BEGIN / COMMIT / ROLLBACK), with the ticket row locked, so status and history can never get out of sync.

## API Endpoints

| Method | URL | Who |
| --- | --- | --- |
| GET | `/api/auth/me` | current Admin (401 until the first Admin exists) |
| GET / POST | `/api/setup` | only before the first Admin exists |
| GET | `/api/tickets?status=&priority=&assignedTo=&from=&to=` | current user (scoped by role) |
| POST | `/api/tickets` | Admin, Employee (body: `title`, `description`, `priority`, `processId`) |
| GET | `/api/processes` | current user (Process dropdown) |
| GET | `/api/tickets/stats` | current user (scoped by role) |
| GET | `/api/tickets/TKT-1001` | users who can see the ticket |
| POST | `/api/tickets/TKT-1001/actions` | depends on action and role |
| GET / POST | `/api/tickets/TKT-1001/replies` | users who can see the ticket |
| GET / POST | `/api/tickets/TKT-1001/attachments` | users who can see the ticket |
| GET | `/api/tickets/TKT-1001/activity` | users who can see the ticket |
| GET | `/api/attachments/12` | users who can see the ticket |
| GET / POST | `/api/users` | Admin |
| PATCH | `/api/users/12` | Admin |
| GET | `/api/users/agents` | Admin |

Action body example:

```json
{ "action": "hold", "reason": "Waiting for spare part" }
```

Actions: `assign` (needs `assigneeId`), `start`, `hold`, `resolve`, `close`, `reopen`.

## Project Structure

```
src/
  app/
    api/              API routes (all permission checks happen here and in services)
    setup/            One-time Create Admin form
    tickets/          Dashboard and ticket detail page
    users/            Users page (Admin)
    globals.css       All styles (Tailwind @apply classes)
  components/         UI components
  lib/
    auth.ts           Current-user session and permission checks
    ticketRules.ts    Workflow + permission rules (single source of truth)
    db.ts             PostgreSQL pool and transaction helper
  services/           Database queries
  types/              Shared TypeScript types and validation
db/migrations/        SQL migrations
```

## Testing Checklist

1. Employee creates a ticket → **Open**.
2. Admin assigns a Support Agent → **Assigned**.
3. Agent clicks Start Work → **In Progress**.
4. Agent puts the ticket On Hold (reason required) → **On Hold**.
5. Agent resumes → **In Progress**.
6. Agent resolves (resolution notes required) → **Resolved**.
7. Employee clicks Confirm & Close → **Closed** (reply box is replaced by a notice).
8. Employee reopens (reason required) → **Reopened**.
9. Admin reassigns → **Assigned**.

Also check: an Employee cannot see other people's tickets or internal notes, an Agent cannot see unassigned tickets, and the activity timeline shows every step.

## Troubleshooting

| Error | Cause | Fix |
| ----- | ----- | --- |
| `password authentication failed for user "postgres"` | Wrong password or port | Check `DATABASE_URL`, restart the server |
| `ECONNREFUSED` | PostgreSQL is not running or wrong port | Start the PostgreSQL service, check the port |
| `relation "roles" does not exist` | Migration 005 not run | Run the migrations in order |
| User missing from the dropdown | User is inactive | Admin sets status to Active in Users → Edit |
| Changes in `.env.local` not working | Env file is read only at startup | Stop the server and run `npm run dev` again |

If the dev server behaves strangely, delete the `.next` folder and start again.
