ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS is_system  BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE roles SET is_system = TRUE WHERE id = 1;

UPDATE permissions SET description = 'Can be assigned tickets (sees tickets assigned to them)'
  WHERE code = 'ticket.view_assigned';
UPDATE permissions SET description = 'Can assign tickets (can be chosen as Assigning Manager)'
  WHERE code = 'ticket.assign';

INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, p.id FROM permissions p
WHERE p.code IN ('ticket.view_assigned', 'ticket.start', 'ticket.hold', 'ticket.resolve')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, p.id FROM permissions p
WHERE p.code <> 'ticket.view_assigned'
ON CONFLICT DO NOTHING;

DELETE FROM role_permissions
WHERE role_id = 1
  AND permission_id = (SELECT id FROM permissions WHERE code = 'ticket.view_assigned');

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS manager_id INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_tickets_manager_id ON tickets (manager_id);
