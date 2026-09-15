-- Generic external side-effect identity. A retry must resolve this record before
-- issuing the same provider operation again.
CREATE TABLE IF NOT EXISTS external_side_effects (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  graph_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  execution_owner TEXT NOT NULL,
  execution_version INTEGER NOT NULL,
  provider TEXT NOT NULL,
  operation TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('authorized','in_flight','completed','failed','unknown')),
  external_operation_id TEXT,
  response_fingerprint TEXT,
  error TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE,
  UNIQUE (tenant_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_external_side_effects_graph
  ON external_side_effects(tenant_id,graph_id,node_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_side_effects_unknown
  ON external_side_effects(tenant_id,status,updated_at) WHERE status='unknown';
CREATE INDEX IF NOT EXISTS idx_external_side_effects_external_id
  ON external_side_effects(tenant_id,provider,external_operation_id);

DROP TRIGGER IF EXISTS external_side_effect_identity_guard;
CREATE TRIGGER external_side_effect_identity_guard
BEFORE UPDATE OF tenant_id,graph_id,node_id,attempt_id,execution_owner,execution_version,provider,operation,idempotency_key,request_fingerprint ON external_side_effects
WHEN OLD.tenant_id<>NEW.tenant_id
  OR OLD.graph_id<>NEW.graph_id
  OR OLD.node_id<>NEW.node_id
  OR OLD.attempt_id<>NEW.attempt_id
  OR OLD.execution_owner<>NEW.execution_owner
  OR OLD.execution_version<>NEW.execution_version
  OR OLD.provider<>NEW.provider
  OR OLD.operation<>NEW.operation
  OR OLD.idempotency_key<>NEW.idempotency_key
  OR OLD.request_fingerprint<>NEW.request_fingerprint
BEGIN SELECT RAISE(ABORT,'External side-effect identity is immutable'); END;

DROP TRIGGER IF EXISTS external_side_effect_terminal_guard;
CREATE TRIGGER external_side_effect_terminal_guard
BEFORE UPDATE ON external_side_effects
WHEN OLD.status IN ('completed','failed')
 AND (NEW.status<>OLD.status OR COALESCE(NEW.external_operation_id,'')<>COALESCE(OLD.external_operation_id,'') OR COALESCE(NEW.response_fingerprint,'')<>COALESCE(OLD.response_fingerprint,'') OR COALESCE(NEW.error,'')<>COALESCE(OLD.error,'') OR COALESCE(NEW.completed_at,'')<>COALESCE(OLD.completed_at,''))
BEGIN SELECT RAISE(ABORT,'Terminal external side-effect cannot be rewritten'); END;

DROP TRIGGER IF EXISTS external_side_effect_status_guard;
CREATE TRIGGER external_side_effect_status_guard
BEFORE UPDATE OF status ON external_side_effects
WHEN OLD.status<>NEW.status
 AND NOT (
   (OLD.status='authorized' AND NEW.status IN ('in_flight','unknown','failed')) OR
   (OLD.status='in_flight' AND NEW.status IN ('completed','failed','unknown')) OR
   (OLD.status='unknown' AND NEW.status IN ('completed','failed','unknown','in_flight')) OR
   (OLD.status='completed' AND NEW.status='completed') OR
   (OLD.status='failed' AND NEW.status='failed')
 )
BEGIN SELECT RAISE(ABORT,'Illegal external side-effect status transition'); END;
