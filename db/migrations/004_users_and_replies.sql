-- Users table + ticket replies table.
-- Ek email = ek user. Same email se dobara reply aaye to wahi user reuse hota hai.

CREATE TABLE IF NOT EXISTS users (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(20)  NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_replies (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id  INTEGER     NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id    INTEGER     NOT NULL REFERENCES users(id),
  message    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ek ticket ke replies jaldi load karne ke liye
CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_id
  ON ticket_replies (ticket_id, created_at);
