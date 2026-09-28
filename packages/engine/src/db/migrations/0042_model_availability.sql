-- Durable model/provider availability. Availability is tenant-scoped because credentials and eligibility may differ by tenant.
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
