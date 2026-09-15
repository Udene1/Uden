-- Append-only execution timeline used for recovery, audit and observability.
CREATE TABLE IF NOT EXISTS execution_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  graph_id TEXT NOT NULL,
  node_id TEXT,
  attempt_id TEXT,
  execution_owner TEXT,
  execution_version INTEGER,
  event_type TEXT NOT NULL,
  status TEXT,
  external_operation_id TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_execution_events_graph_time
  ON execution_events(tenant_id,graph_id,occurred_at,id);
CREATE INDEX IF NOT EXISTS idx_execution_events_attempt_time
  ON execution_events(tenant_id,attempt_id,occurred_at,id);
CREATE INDEX IF NOT EXISTS idx_execution_events_external
  ON execution_events(tenant_id,external_operation_id,occurred_at);

DROP TRIGGER IF EXISTS execution_event_identity_guard;
CREATE TRIGGER execution_event_identity_guard
BEFORE UPDATE ON execution_events
BEGIN SELECT RAISE(ABORT,'Execution events are append-only'); END;

DROP TRIGGER IF EXISTS execution_event_delete_guard;
CREATE TRIGGER execution_event_delete_guard
BEFORE DELETE ON execution_events
BEGIN SELECT RAISE(ABORT,'Execution events are append-only'); END;

-- Repository side effects already have idempotency keys. These guards ensure
-- the durable identity behind a key cannot be rewritten after authorization.
DROP TRIGGER IF EXISTS repository_operation_identity_guard;
CREATE TRIGGER repository_operation_identity_guard
BEFORE UPDATE OF tenant_id,graph_id,node_id,execution_owner,execution_version,provider,repository_owner,repository_name,branch,operation,expected_head_sha,idempotency_key ON repository_operations
WHEN OLD.tenant_id<>NEW.tenant_id OR OLD.graph_id<>NEW.graph_id OR OLD.node_id<>NEW.node_id OR OLD.execution_owner<>NEW.execution_owner OR OLD.execution_version<>NEW.execution_version OR OLD.provider<>NEW.provider OR OLD.repository_owner<>NEW.repository_owner OR OLD.repository_name<>NEW.repository_name OR COALESCE(OLD.branch,'')<>COALESCE(NEW.branch,'') OR OLD.operation<>NEW.operation OR COALESCE(OLD.expected_head_sha,'')<>COALESCE(NEW.expected_head_sha,'') OR OLD.idempotency_key<>NEW.idempotency_key
BEGIN SELECT RAISE(ABORT,'Repository operation identity is immutable'); END;

DROP TRIGGER IF EXISTS repository_operation_terminal_guard;
CREATE TRIGGER repository_operation_terminal_guard
BEFORE UPDATE ON repository_operations
WHEN OLD.status IN ('completed','failed')
 AND (NEW.status<>OLD.status OR COALESCE(NEW.result_sha,'')<>COALESCE(OLD.result_sha,'') OR COALESCE(NEW.pull_request_number,-1)<>COALESCE(OLD.pull_request_number,-1) OR COALESCE(NEW.error,'')<>COALESCE(OLD.error,''))
BEGIN SELECT RAISE(ABORT,'Terminal repository operation cannot be rewritten'); END;
