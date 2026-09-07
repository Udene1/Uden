ALTER TABLE task_graph_nodes ADD COLUMN verification_passed INTEGER;
ALTER TABLE task_graph_nodes ADD COLUMN verification_reason TEXT;
ALTER TABLE task_graph_nodes ADD COLUMN verification_checked_at TEXT;
ALTER TABLE task_graph_nodes ADD COLUMN repair_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE task_graph_nodes ADD COLUMN repair_error TEXT;
CREATE INDEX IF NOT EXISTS idx_task_graph_nodes_repair ON task_graph_nodes(tenant_id, status, repair_attempts);
