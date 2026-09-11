CREATE TABLE IF NOT EXISTS origin_connections (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  installation_id TEXT NOT NULL,
  namespace_id TEXT NOT NULL,
  installed_by TEXT,
  state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active','suspended','deleted')),
  scopes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, installation_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_origin_connections_tenant_state ON origin_connections(tenant_id,state,updated_at);

CREATE TABLE IF NOT EXISTS origin_oauth_states (
  state_hash TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_origin_oauth_states_expiry ON origin_oauth_states(expires_at);
