-- ─────────────────────────────────────────────
-- AI Work Partner — SQLite / Cloudflare D1 Schema
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  api_key_hash TEXT NOT NULL UNIQUE,
  quality_preference TEXT NOT NULL DEFAULT 'balanced', -- 'cost-optimized', 'balanced', 'quality-first'
  monthly_budget_cents INTEGER NOT NULL DEFAULT 10000,
  mode TEXT NOT NULL DEFAULT 'permissionless',         -- 'permissionless', 'permission-based'
  bring_own_keys INTEGER NOT NULL DEFAULT 0,          -- 0 = false, 1 = true
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
  status TEXT NOT NULL DEFAULT 'pending',             -- 'pending', 'classifying', 'routing', 'processing', 'quality-check', 'escalating', 'completed', 'failed', 'awaiting-approval', 'approved', 'rejected'
  classified_tier INTEGER,                            -- 1, 2, 3
  classified_domain TEXT,                             -- 'writing', 'code', 'analysis', 'legal', etc.
  classified_complexity INTEGER,                      -- 1–10
  expected_format TEXT DEFAULT 'markdown',            -- 'text', 'markdown', 'json', 'code', etc.
  model_used TEXT,
  output TEXT,
  proposal_json TEXT,                                 -- Serialized TaskProposal JSON
  routing_plan_json TEXT,                             -- Serialized RoutingPlan JSON
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
  provider TEXT NOT NULL,                             -- 'openai', 'anthropic', 'google', 'deepseek'
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  cost_cents REAL NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_records_tenant_created ON usage_records(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_records_task_id ON usage_records(task_id);
