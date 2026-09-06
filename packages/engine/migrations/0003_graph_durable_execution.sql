-- Durable execution ownership and idempotent attempt identity.
ALTER TABLE task_graphs ADD COLUMN execution_owner TEXT;
ALTER TABLE task_graphs ADD COLUMN lease_until DATETIME;

CREATE UNIQUE INDEX IF NOT EXISTS uq_graph_attempt_identity
  ON task_graph_attempts(graph_id, node_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_task_graphs_lease
  ON task_graphs(status, lease_until);
