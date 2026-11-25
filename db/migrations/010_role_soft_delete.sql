ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_name_active
  ON roles (LOWER(name)) WHERE deleted_at IS NULL;
