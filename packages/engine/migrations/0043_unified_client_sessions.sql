CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  client TEXT NOT NULL CHECK(client IN ('desktop','web','mobile','api')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

UPDATE tenant_members
SET subject = 'tenant:' || tenant_id
WHERE subject = 'tenant-api-key'
  AND NOT EXISTS (
    SELECT 1 FROM tenant_members existing
    WHERE existing.tenant_id = tenant_members.tenant_id
      AND existing.subject = 'tenant:' || tenant_members.tenant_id
  );

DELETE FROM tenant_members
WHERE subject = 'tenant-api-key';

CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_tenant ON auth_sessions(tenant_id, revoked_at, expires_at);
