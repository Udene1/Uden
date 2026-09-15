-- Runtime/attempt history guards.
-- Fencing is enforced by owner + execution_version predicates in the write paths;
-- these triggers additionally prevent an accepted execution from being rewritten
-- after it becomes terminal and prevent its identity from being changed in place.

DROP TRIGGER IF EXISTS task_graph_attempt_identity_guard;
CREATE TRIGGER task_graph_attempt_identity_guard
BEFORE UPDATE OF tenant_id, graph_id, node_id, attempt_number ON task_graph_attempts
BEGIN
  SELECT RAISE(ABORT, 'Graph attempt identity is immutable');
END;

DROP TRIGGER IF EXISTS task_graph_attempt_terminal_guard;
CREATE TRIGGER task_graph_attempt_terminal_guard
BEFORE UPDATE ON task_graph_attempts
WHEN OLD.status IN ('completed','failed','cancelled','abandoned')
 AND (
   NEW.status <> OLD.status OR
   COALESCE(NEW.external_outcome,'') <> COALESCE(OLD.external_outcome,'') OR
   COALESCE(NEW.idempotency_key,'') <> COALESCE(OLD.idempotency_key,'') OR
   COALESCE(NEW.external_error,'') <> COALESCE(OLD.external_error,'') OR
   COALESCE(NEW.outcome_checked_at,'') <> COALESCE(OLD.outcome_checked_at,'') OR
   COALESCE(NEW.completed_at,'') <> COALESCE(OLD.completed_at,'')
 )
BEGIN
  SELECT RAISE(ABORT, 'Terminal graph attempt history is immutable');
END;

DROP TRIGGER IF EXISTS runtime_execution_identity_guard;
CREATE TRIGGER runtime_execution_identity_guard
BEFORE UPDATE OF tenant_id, runtime_id, graph_id, node_id, attempt_id, execution_version, capability, execution_owner ON runtime_executions
BEGIN
  SELECT RAISE(ABORT, 'Runtime execution fence identity is immutable');
END;

DROP TRIGGER IF EXISTS runtime_execution_terminal_guard;
CREATE TRIGGER runtime_execution_terminal_guard
BEFORE UPDATE ON runtime_executions
WHEN OLD.status IN ('completed','failed','timed_out')
 AND (
   NEW.status <> OLD.status OR
   COALESCE(NEW.external_operation_id,'') <> COALESCE(OLD.external_operation_id,'') OR
   COALESCE(NEW.stdout,'') <> COALESCE(OLD.stdout,'') OR
   COALESCE(NEW.stderr,'') <> COALESCE(OLD.stderr,'') OR
   COALESCE(NEW.exit_code,-2147483648) <> COALESCE(OLD.exit_code,-2147483648) OR
   COALESCE(NEW.error,'') <> COALESCE(OLD.error,'') OR
   COALESCE(NEW.started_at,'') <> COALESCE(OLD.started_at,'') OR
   COALESCE(NEW.finished_at,'') <> COALESCE(OLD.finished_at,'') OR
   COALESCE(NEW.recovery_owner,'') <> COALESCE(OLD.recovery_owner,'') OR
   NEW.recovery_version <> OLD.recovery_version
 )
BEGIN
  SELECT RAISE(ABORT, 'Terminal runtime execution history is immutable');
END;

DROP TRIGGER IF EXISTS runtime_execution_status_transition_guard;
CREATE TRIGGER runtime_execution_status_transition_guard
BEFORE UPDATE OF status ON runtime_executions
WHEN OLD.status <> NEW.status
 AND NOT (
   (OLD.status='authorized' AND NEW.status IN ('in_flight','failed','timed_out','possibly_succeeded','unknown')) OR
   (OLD.status='in_flight' AND NEW.status IN ('completed','failed','timed_out','possibly_succeeded','unknown')) OR
   (OLD.status='possibly_succeeded' AND NEW.status IN ('completed','failed','timed_out','possibly_succeeded','unknown')) OR
   (OLD.status='unknown' AND NEW.status IN ('completed','failed','timed_out','possibly_succeeded','unknown')) OR
   (OLD.status='completed' AND NEW.status='completed') OR
   (OLD.status='failed' AND NEW.status='failed') OR
   (OLD.status='timed_out' AND NEW.status='timed_out')
 )
BEGIN
  SELECT RAISE(ABORT, 'Illegal runtime execution status transition');
END;
