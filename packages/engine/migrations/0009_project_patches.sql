CREATE TABLE IF NOT EXISTS project_patches (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  base_version INTEGER NOT NULL,
  content_sha256 TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('applied','rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, path, base_version, content_sha256)
);
CREATE INDEX IF NOT EXISTS idx_project_patches_tenant_project ON project_patches(tenant_id, project_id, created_at DESC);
