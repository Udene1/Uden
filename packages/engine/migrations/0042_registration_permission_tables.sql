-- Idempotent repair for production databases bootstrapped before permission migrations existed.
-- Registration creates the owner membership immediately after creating a tenant,
-- and authenticated operations rely on audit_logs as well.
CREATE TABLE IF NOT EXISTS tenant_members (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner','admin','member','viewer')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, subject),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON tenant_members(tenant_id, role);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  subject TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  request_id TEXT,
  metadata_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(tenant_id, resource_type, resource_id);

-- Production repair: older bootstrap logic skipped all later migrations once
-- the tenants table existed, leaving model_availability absent.
CREATE TABLE IF NOT EXISTS model_availability (
  tenant_id TEXT NOT NULL,
  model_reference TEXT NOT NULL,
  provider TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('unknown', 'healthy', 'unavailable', 'cooldown')),
  failure_code TEXT,
  last_observed_at TEXT,
  cooldown_until TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_success_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, model_reference)
);
CREATE INDEX IF NOT EXISTS idx_model_availability_tenant_state
  ON model_availability (tenant_id, state);
CREATE INDEX IF NOT EXISTS idx_model_availability_cooldown
  ON model_availability (tenant_id, cooldown_until);
