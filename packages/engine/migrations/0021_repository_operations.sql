CREATE TABLE IF NOT EXISTS repository_operations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  graph_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  execution_owner TEXT NOT NULL,
  execution_version INTEGER NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('github','origin')),
  repository_owner TEXT NOT NULL,
  repository_name TEXT NOT NULL,
  branch TEXT,
  operation TEXT NOT NULL CHECK (operation IN ('create_branch','commit_files','create_pull_request','merge_pull_request')),
  expected_head_sha TEXT,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('authorized','in_flight','completed','failed','unknown')),
  external_outcome TEXT NOT NULL CHECK (external_outcome IN ('not_started','in_flight','completed','failed','unknown')) DEFAULT 'not_started',
  result_sha TEXT,
  pull_request_number INTEGER,
  error TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_repository_operations_idempotency ON repository_operations(tenant_id,idempotency_key);
CREATE INDEX IF NOT EXISTS idx_repository_operations_graph ON repository_operations(tenant_id,graph_id,node_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_repository_operations_unknown ON repository_operations(tenant_id,status,updated_at) WHERE status='unknown';
CREATE INDEX IF NOT EXISTS idx_repository_operations_external ON repository_operations(tenant_id,external_outcome,updated_at);
