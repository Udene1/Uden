ALTER TABLE autonomous_objectives ADD COLUMN project_id TEXT;
CREATE INDEX IF NOT EXISTS idx_autonomous_objectives_project ON autonomous_objectives(tenant_id, project_id);
