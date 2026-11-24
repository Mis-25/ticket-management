-- Status ko text ki jagah number (code) me save karna.
--   0 = Open, 1 = Assigned, 2 = In Progress, 3 = Pending (ab "On Hold"),
--   4 = Resolved, 5 = Closed, 6 = Reopened
-- Purana text data apne aap sahi number me convert ho jata hai.
-- Dobara chalane par kuch nahi hota (column pehle se number ho to skip).

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
    ALTER TABLE tickets ALTER COLUMN status DROP DEFAULT;

    ALTER TABLE tickets
      ALTER COLUMN status TYPE SMALLINT
      USING CASE status
        WHEN 'Open'        THEN 0
        WHEN 'Assigned'    THEN 1
        WHEN 'In Progress' THEN 2
        WHEN 'Pending'     THEN 3
        WHEN 'Resolved'    THEN 4
        WHEN 'Closed'      THEN 5
        WHEN 'Reopened'    THEN 6
      END;

    ALTER TABLE tickets ALTER COLUMN status SET DEFAULT 0;
  END IF;
END
$$;

ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets
  ADD CONSTRAINT tickets_status_check CHECK (status BETWEEN 0 AND 6);
