ALTER TABLE task_graph_attempts ADD COLUMN estimated_cost_cents REAL NOT NULL DEFAULT 0;
ALTER TABLE task_graph_attempts ADD COLUMN actual_cost_cents REAL NOT NULL DEFAULT 0;

UPDATE task_graph_attempts
SET actual_cost_cents = COALESCE(cost_cents, 0)
WHERE actual_cost_cents = 0 AND COALESCE(cost_cents, 0) > 0;

CREATE INDEX IF NOT EXISTS idx_graph_attempts_cost
  ON task_graph_attempts(tenant_id, graph_id, estimated_cost_cents, actual_cost_cents);
