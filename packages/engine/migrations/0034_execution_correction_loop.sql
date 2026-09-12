-- Durable diagnosis -> corrective action -> plan revision -> validation records.
-- These records are separate from the contradiction ledger so the contradiction
-- remains immutable evidence while its repair lifecycle evolves.
CREATE TABLE IF NOT EXISTS execution_diagnoses (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  graph_id TEXT NOT NULL,
  contradiction_id TEXT NOT NULL,
  diagnosis TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  evidence_json TEXT,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','accepted','rejected')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at DATETIME,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE,
  FOREIGN KEY (contradiction_id) REFERENCES execution_contradictions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_execution_diagnoses_contradiction ON execution_diagnoses(tenant_id,contradiction_id,created_at DESC);

CREATE TABLE IF NOT EXISTS execution_corrective_actions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  graph_id TEXT NOT NULL,
  diagnosis_id TEXT NOT NULL,
  action TEXT NOT NULL,
  action_input_json TEXT,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','executing','completed','failed','cancelled')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  error TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE,
  FOREIGN KEY (diagnosis_id) REFERENCES execution_diagnoses(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_execution_corrective_actions_graph ON execution_corrective_actions(tenant_id,graph_id,status,created_at ASC);

CREATE TABLE IF NOT EXISTS execution_plan_revisions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  graph_id TEXT NOT NULL,
  contradiction_id TEXT NOT NULL,
  corrective_action_id TEXT NOT NULL,
  previous_plan_hash TEXT,
  revised_plan_json TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','active','superseded','rejected')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activated_at DATETIME,
  superseded_at DATETIME,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE,
  FOREIGN KEY (contradiction_id) REFERENCES execution_contradictions(id) ON DELETE CASCADE,
  FOREIGN KEY (corrective_action_id) REFERENCES execution_corrective_actions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_execution_plan_revisions_graph ON execution_plan_revisions(tenant_id,graph_id,status,created_at DESC);

CREATE TABLE IF NOT EXISTS execution_validations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  graph_id TEXT NOT NULL,
  contradiction_id TEXT NOT NULL,
  plan_revision_id TEXT NOT NULL,
  expected_state_json TEXT,
  observed_state_json TEXT,
  result TEXT NOT NULL CHECK (result IN ('passed','failed','inconclusive')),
  validation_message TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE,
  FOREIGN KEY (contradiction_id) REFERENCES execution_contradictions(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_revision_id) REFERENCES execution_plan_revisions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_execution_validations_graph ON execution_validations(tenant_id,graph_id,created_at DESC);
