ALTER TABLE permissions
  ADD COLUMN IF NOT EXISTS recommended_for TEXT[] NOT NULL DEFAULT '{}';

UPDATE permissions
  SET description = 'Reopen resolved/closed tickets (own, or as the ticket''s manager)'
  WHERE code = 'ticket.reopen';

UPDATE permissions p SET recommended_for = v.roles
FROM (VALUES
  ('ticket.assign',        ARRAY['Admin', 'Manager']),
  ('ticket.view_assigned', ARRAY['Support Engineer', 'Employee']),
  ('ticket.create',        ARRAY['Admin', 'Manager', 'Support Engineer', 'Employee']),
  ('ticket.view_all',      ARRAY['Admin']),
  ('ticket.view_own',      ARRAY['Admin', 'Manager', 'Support Engineer', 'Employee']),
  ('ticket.start',         ARRAY['Support Engineer', 'Employee']),
  ('ticket.hold',          ARRAY['Support Engineer', 'Employee']),
  ('ticket.resolve',       ARRAY['Support Engineer', 'Employee']),
  ('ticket.close_confirm', ARRAY['Admin', 'Manager', 'Support Engineer', 'Employee']),
  ('ticket.close_any',     ARRAY['Admin']),
  ('ticket.reopen',        ARRAY['Admin', 'Manager', 'Support Engineer', 'Employee']),
  ('ticket.delete',        ARRAY['Admin']),
  ('comment.public',       ARRAY['Admin', 'Manager', 'Support Engineer', 'Employee']),
  ('comment.internal',     ARRAY['Admin', 'Manager', 'Support Engineer']),
  ('attachment.upload',    ARRAY['Admin', 'Manager', 'Support Engineer', 'Employee']),
  ('history.view',         ARRAY['Admin', 'Manager', 'Support Engineer', 'Employee']),
  ('user.manage',          ARRAY['Admin']),
  ('process.manage',       ARRAY['Admin'])
) AS v(code, roles)
WHERE p.code = v.code;
