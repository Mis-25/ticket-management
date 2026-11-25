ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_tickets_not_deleted ON tickets (created_at)
  WHERE deleted_at IS NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'inactive', 'deleted'));

INSERT INTO permissions (code, description) VALUES
  ('ticket.delete', 'Delete tickets')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE code = 'ticket.delete'
ON CONFLICT DO NOTHING;
