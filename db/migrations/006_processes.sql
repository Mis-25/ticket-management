-- =====================================================================
-- 006: Company processes — har ticket ek process ke liye hota hai
-- =====================================================================
-- Process names ek hi jagah (processes table) me rehte hain.
-- tickets.process_id us table ko point karta hai (naam copy nahi hota).
-- Purane tickets me process_id NULL rahega (UI me "—" dikhega).
-- Naya ticket banate waqt process chunna zaroori hai (API check karti hai).
-- =====================================================================

CREATE TABLE IF NOT EXISTS processes (
  id         INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  sort_order SMALLINT     NOT NULL DEFAULT 0,
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS process_id INTEGER REFERENCES processes(id);

CREATE INDEX IF NOT EXISTS idx_tickets_process_id ON tickets(process_id);

-- Company ke process names (dropdown me isi order me aayenge).
-- Naya process jodna ho to yahan ek line add karke dobara chalao —
-- ON CONFLICT ki wajah se purane rows duplicate nahi honge.
-- INSERT INTO processes (name, sort_order) VALUES
--   ('Process Name 1', 1),
--   ('Process Name 2', 2)
-- ON CONFLICT (name) DO NOTHING;
