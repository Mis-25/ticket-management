CREATE TABLE IF NOT EXISTS roles (
  id          SMALLINT     PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL UNIQUE,
  description TEXT
);

INSERT INTO roles (id, name, description) VALUES
  (1, 'Admin',         'Manages users, assigns tickets, full access'),
  (2, 'Support Agent', 'Works on tickets assigned to them'),
  (3, 'Employee',      'Creates and follows their own tickets')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS permissions (
  id          INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code        VARCHAR(50)  NOT NULL UNIQUE,
  description TEXT         NOT NULL
);

INSERT INTO permissions (code, description) VALUES
  ('ticket.create',         'Create new tickets'),
  ('ticket.view_all',       'View all tickets'),
  ('ticket.view_assigned',  'View tickets assigned to me'),
  ('ticket.view_own',       'View tickets I created'),
  ('ticket.assign',         'Assign / reassign tickets'),
  ('ticket.start',          'Start work (In Progress)'),
  ('ticket.hold',           'Put ticket On Hold'),
  ('ticket.resolve',        'Resolve ticket with resolution note'),
  ('ticket.close_confirm',  'Confirm resolution and close own ticket'),
  ('ticket.close_any',      'Close any ticket with a reason'),
  ('ticket.reopen',         'Reopen own resolved/closed ticket'),
  ('comment.public',        'Add public replies'),
  ('comment.internal',      'Add / view internal notes'),
  ('attachment.upload',     'Upload attachments'),
  ('history.view',          'View ticket history'),
  ('user.manage',           'Create and manage users')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       SMALLINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER  NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.id
FROM (VALUES
  (1, 'ticket.create'), (1, 'ticket.view_all'), (1, 'ticket.assign'),
  (1, 'ticket.start'), (1, 'ticket.hold'), (1, 'ticket.resolve'),
  (1, 'ticket.close_any'), (1, 'ticket.close_confirm'), (1, 'ticket.reopen'),
  (1, 'comment.public'), (1, 'comment.internal'), (1, 'attachment.upload'),
  (1, 'history.view'), (1, 'user.manage'),
  (2, 'ticket.view_assigned'), (2, 'ticket.start'), (2, 'ticket.hold'),
  (2, 'ticket.resolve'), (2, 'comment.public'), (2, 'comment.internal'),
  (2, 'attachment.upload'), (2, 'history.view'),
  (3, 'ticket.create'), (3, 'ticket.view_own'), (3, 'ticket.close_confirm'),
  (3, 'ticket.reopen'), (3, 'comment.public'), (3, 'attachment.upload'),
  (3, 'history.view')
) AS r(role_id, code)
JOIN permissions p ON p.code = r.code
ON CONFLICT DO NOTHING;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(100),
  ADD COLUMN IF NOT EXISTS role_id       SMALLINT    NOT NULL DEFAULT 3 REFERENCES roles(id),
  ADD COLUMN IF NOT EXISTS status        VARCHAR(10) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ;
UPDATE users SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT NOW(),
                  ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'inactive'));

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users (role_id);

CREATE TABLE IF NOT EXISTS user_sessions (
  id          INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  CHAR(64)    NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS ticket_number   VARCHAR(20)
    GENERATED ALWAYS AS ('TKT-' || id::text) STORED,
  ADD COLUMN IF NOT EXISTS priority        VARCHAR(10) NOT NULL DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS created_by      INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS assigned_to     INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS assigned_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_note TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reopened_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ;

UPDATE tickets SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE tickets ALTER COLUMN updated_at SET DEFAULT NOW(),
                    ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_priority_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_priority_check
  CHECK (priority IN ('Low', 'Medium', 'High', 'Critical'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_ticket_number ON tickets (ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_status      ON tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by  ON tickets (created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets (assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at  ON tickets (created_at);

ALTER TABLE ticket_replies
  ADD COLUMN IF NOT EXISTS comment_type VARCHAR(10) NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ;
UPDATE ticket_replies SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE ticket_replies ALTER COLUMN updated_at SET DEFAULT NOW(),
                           ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE ticket_replies DROP CONSTRAINT IF EXISTS ticket_replies_comment_type_check;
ALTER TABLE ticket_replies ADD CONSTRAINT ticket_replies_comment_type_check
  CHECK (comment_type IN ('public', 'internal'));

CREATE TABLE IF NOT EXISTS ticket_status_history (
  id          INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id   INTEGER     NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
  old_status  SMALLINT    CHECK (old_status BETWEEN 0 AND 6),
  new_status  SMALLINT    NOT NULL CHECK (new_status BETWEEN 0 AND 6),
  changed_by  INTEGER     NOT NULL REFERENCES users(id),
  reason      TEXT,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ticket_status_history_change_check
    CHECK (old_status IS DISTINCT FROM new_status)
);
CREATE INDEX IF NOT EXISTS idx_status_history_ticket
  ON ticket_status_history (ticket_id, created_at);

CREATE TABLE IF NOT EXISTS ticket_assignments (
  id                   INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id            INTEGER     NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
  assigned_to          INTEGER     NOT NULL REFERENCES users(id),
  assigned_by          INTEGER     NOT NULL REFERENCES users(id),
  previous_assignee_id INTEGER     REFERENCES users(id),
  assignment_note      TEXT,
  assigned_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unassigned_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_assignments_ticket
  ON ticket_assignments (ticket_id, assigned_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_one_active
  ON ticket_assignments (ticket_id) WHERE unassigned_at IS NULL;

CREATE TABLE IF NOT EXISTS ticket_attachments (
  id          INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id   INTEGER      NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
  uploaded_by INTEGER      NOT NULL REFERENCES users(id),
  file_name   VARCHAR(255) NOT NULL,
  file_path   VARCHAR(255) NOT NULL,
  file_type   VARCHAR(100) NOT NULL,
  file_size   INTEGER      NOT NULL CHECK (file_size > 0),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attachments_ticket ON ticket_attachments (ticket_id);

CREATE TABLE IF NOT EXISTS ticket_activity_log (
  id          INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id   INTEGER     NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
  user_id     INTEGER     NOT NULL REFERENCES users(id),
  action_type VARCHAR(30) NOT NULL CHECK (action_type IN (
    'Ticket Created', 'Ticket Assigned', 'Ticket Reassigned', 'Status Changed',
    'Comment Added', 'Internal Note Added', 'Attachment Uploaded',
    'Ticket Put On Hold', 'Ticket Resolved', 'Ticket Closed', 'Ticket Reopened'
  )),
  old_value   TEXT,
  new_value   TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_ticket
  ON ticket_activity_log (ticket_id, created_at);

CREATE OR REPLACE FUNCTION prevent_history_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% records cannot be modified or deleted', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_status_history_readonly ON ticket_status_history;
CREATE TRIGGER trg_status_history_readonly
  BEFORE UPDATE OR DELETE ON ticket_status_history
  FOR EACH ROW EXECUTE FUNCTION prevent_history_change();

DROP TRIGGER IF EXISTS trg_activity_log_readonly ON ticket_activity_log;
CREATE TRIGGER trg_activity_log_readonly
  BEFORE UPDATE OR DELETE ON ticket_activity_log
  FOR EACH ROW EXECUTE FUNCTION prevent_history_change();
