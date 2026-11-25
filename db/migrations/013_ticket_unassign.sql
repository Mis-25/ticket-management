ALTER TABLE ticket_activity_log
  DROP CONSTRAINT IF EXISTS ticket_activity_log_action_type_check;

ALTER TABLE ticket_activity_log
  ADD CONSTRAINT ticket_activity_log_action_type_check CHECK (action_type IN (
    'Ticket Created', 'Ticket Assigned', 'Ticket Reassigned', 'Ticket Unassigned',
    'Status Changed', 'Comment Added', 'Internal Note Added', 'Attachment Uploaded',
    'Ticket Put On Hold', 'Ticket Resolved', 'Ticket Closed', 'Ticket Reopened'
  ));
