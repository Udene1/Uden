-- Bind durable graph execution to the authenticated API key/principal.
ALTER TABLE task_graphs ADD COLUMN execution_principal TEXT;
CREATE INDEX IF NOT EXISTS idx_task_graphs_execution_principal ON task_graphs(tenant_id, execution_principal, created_at);
