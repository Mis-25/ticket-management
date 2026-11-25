ALTER TABLE processes
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE processes DROP CONSTRAINT IF EXISTS processes_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_processes_name_active
  ON processes (LOWER(name)) WHERE deleted_at IS NULL;
