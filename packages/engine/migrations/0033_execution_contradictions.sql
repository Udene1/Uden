CREATE TABLE IF NOT EXISTS execution_contradictions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  graph_id TEXT NOT NULL,
  node_id TEXT,
  category TEXT NOT NULL CHECK (category IN ('integrity','concurrency','planning','external_uncertainty')),
  message TEXT NOT NULL,
  expected_state_json TEXT,
  observed_state_json TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_execution_contradictions_graph ON execution_contradictions(tenant_id,graph_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_contradictions_open ON execution_contradictions(tenant_id,status,created_at ASC) WHERE status='open';
