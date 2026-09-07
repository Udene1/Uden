CREATE TABLE IF NOT EXISTS google_connections (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  google_subject TEXT NOT NULL,
  email TEXT,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at INTEGER NOT NULL,
  scopes TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, google_subject),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_google_connections_tenant ON google_connections(tenant_id);
