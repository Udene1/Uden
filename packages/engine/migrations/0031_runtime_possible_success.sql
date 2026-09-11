PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS runtime_executions_v31 (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  runtime_id TEXT NOT NULL,
  graph_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  execution_version INTEGER NOT NULL,
  execution_owner TEXT NOT NULL,
  capability TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('authorized','in_flight','completed','failed','timed_out','possibly_succeeded','unknown')),
  external_operation_id TEXT,
  working_directory TEXT,
  command TEXT,
  args_json TEXT,
  stdout TEXT,
  stderr TEXT,
  exit_code INTEGER,
  error TEXT,
  started_at TEXT,
  finished_at TEXT,
  recovery_owner TEXT,
  recovery_version INTEGER NOT NULL DEFAULT 0,
  recovery_lease_until TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE,
  UNIQUE (tenant_id,attempt_id)
);

INSERT INTO runtime_executions_v31 SELECT * FROM runtime_executions;
DROP TABLE runtime_executions;
ALTER TABLE runtime_executions_v31 RENAME TO runtime_executions;
CREATE INDEX IF NOT EXISTS idx_runtime_executions_runtime ON runtime_executions(tenant_id,runtime_id,status,updated_at);
CREATE INDEX IF NOT EXISTS idx_runtime_executions_graph ON runtime_executions(tenant_id,graph_id,node_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runtime_executions_recovery ON runtime_executions(tenant_id,status,updated_at) WHERE status IN ('in_flight','possibly_succeeded','unknown');
PRAGMA foreign_keys=ON;
