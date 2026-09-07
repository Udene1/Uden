CREATE TABLE IF NOT EXISTS graph_repair_proposals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  graph_id TEXT NOT NULL REFERENCES task_graphs(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL CHECK(attempt_number >= 1),
  status TEXT NOT NULL CHECK(status IN ('proposed','approved','applied','rejected','failed')),
  instruction TEXT NOT NULL,
  patch_json TEXT NOT NULL,
  reason TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_by TEXT,
  approved_at TEXT,
  applied_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(graph_id,node_id,attempt_number)
);
CREATE INDEX IF NOT EXISTS idx_graph_repair_proposals_tenant_status
  ON graph_repair_proposals(tenant_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_graph_repair_proposals_graph_node
  ON graph_repair_proposals(tenant_id,graph_id,node_id,attempt_number DESC);
