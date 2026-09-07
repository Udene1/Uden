ALTER TABLE autonomous_objective_runs ADD COLUMN workflow_instance_id TEXT;
CREATE INDEX IF NOT EXISTS idx_autonomous_objective_runs_workflow ON autonomous_objective_runs(tenant_id, workflow_instance_id);
