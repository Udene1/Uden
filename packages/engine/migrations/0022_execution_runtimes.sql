CREATE TABLE IF NOT EXISTS execution_runtimes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('cloud_sandbox','cloud_automation','desktop_local')),
  state TEXT NOT NULL CHECK (state IN ('online','draining','offline')),
  capabilities_json TEXT NOT NULL,
  last_heartbeat_at TEXT NOT NULL,
  metadata_json TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_execution_runtimes_tenant_state ON execution_runtimes(tenant_id,state,last_heartbeat_at);

CREATE TABLE IF NOT EXISTS runtime_executions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  runtime_id TEXT NOT NULL,
  graph_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  execution_version INTEGER NOT NULL,
  capability TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('authorized','in_flight','completed','failed','timed_out','unknown')),
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
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE,
  UNIQUE (tenant_id,attempt_id)
);
CREATE INDEX IF NOT EXISTS idx_runtime_executions_runtime ON runtime_executions(tenant_id,runtime_id,status,updated_at);
CREATE INDEX IF NOT EXISTS idx_runtime_executions_graph ON runtime_executions(tenant_id,graph_id,node_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runtime_executions_recovery ON runtime_executions(tenant_id,status,updated_at) WHERE status IN ('in_flight','unknown');
