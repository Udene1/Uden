ALTER TABLE task_graph_attempts ADD COLUMN external_outcome TEXT NOT NULL DEFAULT 'not_started';
ALTER TABLE task_graph_attempts ADD COLUMN idempotency_key TEXT;
ALTER TABLE task_graph_attempts ADD COLUMN outcome_checked_at TEXT;
ALTER TABLE task_graph_attempts ADD COLUMN external_error TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_graph_attempts_idempotency_key
  ON task_graph_attempts(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
