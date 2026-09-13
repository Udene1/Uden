-- Bind correction and validation records to distinct execution principals.
-- Nullable for historical records; new contradiction resolution requires both.
ALTER TABLE execution_corrective_actions ADD COLUMN executor_principal TEXT;
ALTER TABLE execution_validations ADD COLUMN validator_principal TEXT;
CREATE INDEX IF NOT EXISTS idx_execution_actions_executor ON execution_corrective_actions(tenant_id,executor_principal,created_at);
CREATE INDEX IF NOT EXISTS idx_execution_validations_validator ON execution_validations(tenant_id,validator_principal,created_at);

-- Append-only resolution evidence. The original contradiction row remains the
-- source evidence; this records exactly which independent validation closed it.
CREATE TABLE IF NOT EXISTS execution_contradiction_resolutions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  graph_id TEXT NOT NULL,
  contradiction_id TEXT NOT NULL UNIQUE,
  validation_id TEXT NOT NULL UNIQUE,
  plan_revision_id TEXT NOT NULL,
  corrective_action_id TEXT NOT NULL,
  executor_principal TEXT NOT NULL,
  validator_principal TEXT NOT NULL,
  resolution_reason TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE,
  FOREIGN KEY (contradiction_id) REFERENCES execution_contradictions(id) ON DELETE CASCADE,
  FOREIGN KEY (validation_id) REFERENCES execution_validations(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_revision_id) REFERENCES execution_plan_revisions(id) ON DELETE CASCADE,
  FOREIGN KEY (corrective_action_id) REFERENCES execution_corrective_actions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_execution_contradiction_resolutions_graph ON execution_contradiction_resolutions(tenant_id,graph_id,created_at DESC);
