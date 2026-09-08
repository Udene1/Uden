-- Execution-side fencing for financial/accounting and runtime side effects.
-- A reclaimed worker may never mutate these records using an old execution generation.
ALTER TABLE task_graph_attempts ADD COLUMN execution_owner TEXT;
ALTER TABLE task_graph_attempts ADD COLUMN execution_version INTEGER;
ALTER TABLE usage_records ADD COLUMN graph_id TEXT;
ALTER TABLE usage_records ADD COLUMN execution_owner TEXT;
ALTER TABLE usage_records ADD COLUMN execution_version INTEGER;
ALTER TABLE budget_reservations ADD COLUMN graph_id TEXT;
ALTER TABLE budget_reservations ADD COLUMN execution_owner TEXT;
ALTER TABLE budget_reservations ADD COLUMN execution_version INTEGER;

CREATE INDEX IF NOT EXISTS idx_graph_attempts_execution_fence
  ON task_graph_attempts(graph_id, execution_owner, execution_version);
CREATE INDEX IF NOT EXISTS idx_usage_records_graph_execution
  ON usage_records(graph_id, execution_owner, execution_version);
CREATE INDEX IF NOT EXISTS idx_budget_reservations_graph_execution
  ON budget_reservations(graph_id, execution_owner, execution_version);

CREATE TABLE IF NOT EXISTS graph_runtime_results (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  graph_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  job_id TEXT NOT NULL,
  status TEXT NOT NULL,
  exit_code INTEGER,
  output TEXT,
  execution_owner TEXT NOT NULL,
  execution_version INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE,
  UNIQUE(graph_id, node_id, attempt_number)
);
CREATE INDEX IF NOT EXISTS idx_runtime_results_tenant_graph
  ON graph_runtime_results(tenant_id, graph_id, node_id, attempt_number);
