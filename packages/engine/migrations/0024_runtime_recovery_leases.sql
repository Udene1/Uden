ALTER TABLE runtime_executions ADD COLUMN recovery_owner TEXT;
ALTER TABLE runtime_executions ADD COLUMN recovery_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE runtime_executions ADD COLUMN recovery_lease_until TEXT;
CREATE INDEX IF NOT EXISTS idx_runtime_executions_recovery_claim ON runtime_executions(tenant_id,status,recovery_lease_until,updated_at);
