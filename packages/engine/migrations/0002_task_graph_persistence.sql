-- Durable task graph state. Safe to run after 0001/base schema.
CREATE TABLE IF NOT EXISTS task_graphs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  root_task_id TEXT NOT NULL UNIQUE,
  project_id TEXT,
  goal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  execution_version INTEGER NOT NULL DEFAULT 1,
  active_node_id TEXT,
  last_error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (root_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_task_graphs_tenant_created ON task_graphs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_graphs_tenant_status ON task_graphs(tenant_id, status);

CREATE TABLE IF NOT EXISTS task_graph_nodes (
  id TEXT NOT NULL,
  graph_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  domain TEXT NOT NULL,
  complexity INTEGER NOT NULL,
  expected_format TEXT NOT NULL,
  recommended_tier INTEGER NOT NULL,
  dependencies_json TEXT NOT NULL,
  context_from_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  selected_model TEXT,
  attempted_models_json TEXT NOT NULL DEFAULT '[]',
  output TEXT,
  quality_score REAL,
  cost_cents REAL NOT NULL DEFAULT 0,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (graph_id, id),
  FOREIGN KEY (graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_tenant_graph ON task_graph_nodes(tenant_id, graph_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_graph_status ON task_graph_nodes(graph_id, status);

CREATE TABLE IF NOT EXISTS task_graph_attempts (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  model TEXT NOT NULL,
  provider TEXT,
  status TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  cost_cents REAL NOT NULL DEFAULT 0,
  quality_score REAL,
  escalation_reason TEXT,
  error TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (graph_id, node_id) REFERENCES task_graph_nodes(graph_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_graph_attempts_tenant_graph ON task_graph_attempts(tenant_id, graph_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_graph_attempts_node ON task_graph_attempts(graph_id, node_id, attempt_number);
