-- 001: Original tickets table (sirf naye / khali database ke liye).
-- Existing database par ye pehle hi chal chuka hai — dobara chalane se kuch nahi hota.

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1001) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'Open'
    CONSTRAINT tickets_status_check CHECK (status IN ('Open', 'Closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
