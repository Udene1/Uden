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
