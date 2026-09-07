CREATE TABLE IF NOT EXISTS autonomous_objectives (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  plan_json TEXT NOT NULL,
  permissions_json TEXT NOT NULL DEFAULT '[]',
  resources_json TEXT NOT NULL DEFAULT '[]',
  success_criteria TEXT,
  interval_seconds INTEGER NOT NULL CHECK(interval_seconds >= 60),
  next_run_at TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  last_run_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_autonomous_objectives_due ON autonomous_objectives(enabled, next_run_at);
CREATE INDEX IF NOT EXISTS idx_autonomous_objectives_tenant ON autonomous_objectives(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS autonomous_objective_runs (
  id TEXT PRIMARY KEY,
  objective_id TEXT NOT NULL REFERENCES autonomous_objectives(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  scheduled_for TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('queued','running','completed','failed')),
  graph_id TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_autonomous_objective_runs_objective ON autonomous_objective_runs(objective_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_autonomous_objective_runs_tenant ON autonomous_objective_runs(tenant_id, created_at DESC);
