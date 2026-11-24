-- Ticket status: Open / Closed se badha kar 7 status allow karna.
-- Purana data (Open, Closed) valid rehta hai, kuch delete nahi hota.
-- Sirf tab chalta hai jab status abhi text (VARCHAR) hai; 003 ke baad
-- (status number ban jane par) dobara chalane se kuch nahi hota.

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

    -- "In Progress" 11 letters ka hai, purana varchar(10) chhota tha.
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
