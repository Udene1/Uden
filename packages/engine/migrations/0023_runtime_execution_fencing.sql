ALTER TABLE runtime_executions ADD COLUMN execution_owner TEXT;
CREATE INDEX IF NOT EXISTS idx_runtime_executions_fence ON runtime_executions(tenant_id,graph_id,execution_version,execution_owner,status);
