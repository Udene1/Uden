-- Make audited contradiction resolution safe to retry after a committed write.
-- A caller supplies a stable request id; retries reuse the same durable resolution.
ALTER TABLE execution_contradiction_resolutions ADD COLUMN resolution_request_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_execution_contradiction_resolutions_request
  ON execution_contradiction_resolutions(tenant_id,resolution_request_id)
  WHERE resolution_request_id IS NOT NULL;
