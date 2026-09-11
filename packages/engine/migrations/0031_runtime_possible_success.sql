PRAGMA foreign_keys=OFF;
CREATE TABLE IF NOT EXISTS runtime_executions_v31 (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  runtime_id TEXT NOT NULL,
  graph_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  execution_version INTEGER NOT NULL,
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
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  execution_owner TEXT,
  recovery_owner TEXT,
  recovery_version INTEGER NOT NULL DEFAULT 0,
  recovery_lease_until TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE,
  UNIQUE (tenant_id,attempt_id)
);
INSERT INTO runtime_executions_v31 (id,tenant_id,runtime_id,graph_id,node_id,attempt_id,execution_version,capability,status,external_operation_id,working_directory,command,args_json,stdout,stderr,exit_code,error,started_at,finished_at,created_at,updated_at,execution_owner,recovery_owner,recovery_version,recovery_lease_until)
SELECT id,tenant_id,runtime_id,graph_id,node_id,attempt_id,execution_version,capability,status,external_operation_id,working_directory,command,args_json,stdout,stderr,exit_code,error,started_at,finished_at,created_at,updated_at,execution_owner,recovery_owner,recovery_version,recovery_lease_until
FROM runtime_executions;
DROP TABLE runtime_executions;
ALTER TABLE runtime_executions_v31 RENAME TO runtime_executions;
CREATE INDEX IF NOT EXISTS idx_runtime_executions_runtime ON runtime_executions(tenant_id,runtime_id,status,updated_at);
CREATE INDEX IF NOT EXISTS idx_runtime_executions_graph ON runtime_executions(tenant_id,graph_id,node_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runtime_executions_recovery ON runtime_executions(tenant_id,status,updated_at) WHERE status IN ('in_flight','possibly_succeeded','unknown');
CREATE INDEX IF NOT EXISTS idx_runtime_executions_fence ON runtime_executions(tenant_id,graph_id,execution_version,execution_owner,status);
PRAGMA foreign_keys=ON;
