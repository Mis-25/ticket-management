INSERT INTO processes (name, sort_order)
SELECT v.name, v.sort_order
FROM (VALUES
  ('Project Manager',      1),
  ('Software Developer',   2),
  ('Sales Team',           3),
  ('Project Engineer',     4),
  ('HR',                   5),
  ('Business Development', 6)
) AS v(name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM processes p WHERE LOWER(p.name) = LOWER(v.name));

INSERT INTO permissions (code, description) VALUES
  ('process.manage', 'Add and manage company processes')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE code = 'process.manage'
ON CONFLICT DO NOTHING;
