DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'tickets'
      AND column_name = 'status'
      AND data_type = 'character varying'
  ) THEN
    ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;

    ALTER TABLE tickets ALTER COLUMN status TYPE VARCHAR(20);

    ALTER TABLE tickets
      ADD CONSTRAINT tickets_status_check
      CHECK (status IN (
        'Open',
        'Assigned',
        'In Progress',
        'Pending',
        'Resolved',
        'Closed',
        'Reopened'
      ));
  END IF;
END
$$;
