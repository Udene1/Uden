CREATE TABLE IF NOT EXISTS graph_approval_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  graph_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','superseded')),
  reason TEXT,
  requested_by TEXT NOT NULL,
  decided_by TEXT,
  decision_reason TEXT,
  requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_graph_approval_active ON graph_approval_requests(graph_id,node_id) WHERE status='pending';
CREATE INDEX IF NOT EXISTS idx_graph_approval_tenant_status ON graph_approval_requests(tenant_id,status,requested_at);
CREATE INDEX IF NOT EXISTS idx_graph_approval_graph ON graph_approval_requests(tenant_id,graph_id,requested_at);
