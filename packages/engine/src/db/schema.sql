-- ─────────────────────────────────────────────
-- AI Work Partner — SQLite / Cloudflare D1 Schema
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  api_key_hash TEXT NOT NULL UNIQUE,
  quality_preference TEXT NOT NULL DEFAULT 'balanced',
  monthly_budget_cents INTEGER NOT NULL DEFAULT 10000,
  mode TEXT NOT NULL DEFAULT 'permissionless',
  bring_own_keys INTEGER NOT NULL DEFAULT 0,
  provider_keys_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tenants_api_key_hash ON tenants(api_key_hash);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  context TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects(tenant_id);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  project_id TEXT,
  prompt TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'permissionless',
  status TEXT NOT NULL DEFAULT 'pending',
  classified_tier INTEGER,
  classified_domain TEXT,
  classified_complexity INTEGER,
  expected_format TEXT DEFAULT 'markdown',
  model_used TEXT,
  output TEXT,
  proposal_json TEXT,
  routing_plan_json TEXT,
  quality_score REAL,
  total_cost_cents REAL DEFAULT 0,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  escalation_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_created ON tasks(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(tenant_id, status);

CREATE TABLE IF NOT EXISTS escalation_logs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  from_model TEXT NOT NULL,
  to_model TEXT NOT NULL,
  reason TEXT NOT NULL,
  quality_score REAL NOT NULL,
  attempt_number INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_escalation_logs_task_id ON escalation_logs(task_id);

CREATE TABLE IF NOT EXISTS usage_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  task_id TEXT,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  cost_cents REAL NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_usage_records_tenant_created ON usage_records(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_records_task_id ON usage_records(task_id);

CREATE TABLE IF NOT EXISTS task_graphs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  root_task_id TEXT NOT NULL UNIQUE,
  project_id TEXT,
  goal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  execution_version INTEGER NOT NULL DEFAULT 1,
  execution_owner TEXT,
  lease_until DATETIME,
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
CREATE INDEX IF NOT EXISTS idx_task_graphs_lease ON task_graphs(status, lease_until);

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
CREATE UNIQUE INDEX IF NOT EXISTS uq_graph_attempt_identity ON task_graph_attempts(graph_id, node_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_graph_attempts_tenant_graph ON task_graph_attempts(tenant_id, graph_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_graph_attempts_node ON task_graph_attempts(graph_id, node_id, attempt_number);
