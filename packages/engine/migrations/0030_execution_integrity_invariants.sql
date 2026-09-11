-- Execution-integrity invariants. These are database guards, not executor conventions.
-- An illegal transition is an integrity failure and must stop execution.

DROP TRIGGER IF EXISTS task_graph_nodes_status_transition_guard;
CREATE TRIGGER task_graph_nodes_status_transition_guard
BEFORE UPDATE OF status ON task_graph_nodes
WHEN OLD.status <> NEW.status
 AND NOT (
   (OLD.status='pending' AND NEW.status IN ('ready','blocked','awaiting-approval')) OR
   (OLD.status='ready' AND NEW.status IN ('running','blocked','awaiting-approval','awaiting-runtime')) OR
   (OLD.status='running' AND NEW.status IN ('completed','failed','blocked','awaiting-approval','awaiting-runtime','awaiting-reconciliation')) OR
   (OLD.status='awaiting-runtime' AND NEW.status IN ('running','completed','failed','blocked','awaiting-reconciliation')) OR
   (OLD.status='awaiting-reconciliation' AND NEW.status IN ('running','completed','failed','blocked','awaiting-approval')) OR
   (OLD.status='awaiting-approval' AND NEW.status IN ('running','blocked','failed')) OR
   (OLD.status='failed' AND NEW.status IN ('running','failed','awaiting-approval')) OR
   (OLD.status='blocked' AND NEW.status IN ('running','blocked')) OR
   (OLD.status='completed' AND NEW.status='completed')
 )
BEGIN
  SELECT RAISE(ABORT, 'Illegal task graph node status transition');
END;

DROP TRIGGER IF EXISTS task_graph_status_transition_guard;
CREATE TRIGGER task_graph_status_transition_guard
BEFORE UPDATE OF status ON task_graphs
WHEN OLD.status <> NEW.status
 AND NOT (
   (OLD.status='running' AND NEW.status IN ('completed','failed','blocked','awaiting-approval','awaiting-runtime')) OR
   (OLD.status='awaiting-runtime' AND NEW.status IN ('running','completed','failed','blocked','awaiting-approval')) OR
   (OLD.status='awaiting-approval' AND NEW.status IN ('running','completed','failed','blocked')) OR
   (OLD.status='failed' AND NEW.status IN ('running','failed')) OR
   (OLD.status='blocked' AND NEW.status IN ('running','blocked')) OR
   (OLD.status='completed' AND NEW.status='completed')
 )
BEGIN
  SELECT RAISE(ABORT, 'Illegal task graph status transition');
END;

DROP TRIGGER IF EXISTS task_graph_terminal_provider_guard;
CREATE TRIGGER task_graph_terminal_provider_guard
BEFORE UPDATE OF status ON task_graphs
WHEN NEW.status IN ('completed','failed','blocked')
 AND EXISTS (SELECT 1 FROM task_graph_attempts WHERE graph_id=NEW.id AND tenant_id=NEW.tenant_id AND external_outcome IN ('in_flight','possibly_succeeded','unknown'))
BEGIN
  SELECT RAISE(ABORT, 'Graph cannot become terminal with unresolved provider side effects');
END;

DROP TRIGGER IF EXISTS task_graph_terminal_unknown_guard;
CREATE TRIGGER task_graph_terminal_unknown_guard
BEFORE UPDATE OF status ON task_graphs
WHEN NEW.status IN ('completed','failed','blocked')
 AND EXISTS (SELECT 1 FROM repository_operations WHERE graph_id=NEW.id AND tenant_id=NEW.tenant_id AND external_outcome IN ('in_flight','unknown'))
BEGIN
  SELECT RAISE(ABORT, 'Graph cannot become terminal with unresolved repository side effects');
END;

DROP TRIGGER IF EXISTS task_graph_terminal_runtime_guard;
CREATE TRIGGER task_graph_terminal_runtime_guard
BEFORE UPDATE OF status ON task_graphs
WHEN NEW.status IN ('completed','failed','blocked')
 AND EXISTS (SELECT 1 FROM runtime_executions WHERE graph_id=NEW.id AND tenant_id=NEW.tenant_id AND status IN ('in_flight','possibly_succeeded','unknown'))
BEGIN
  SELECT RAISE(ABORT, 'Graph cannot become terminal with unresolved runtime side effects');
END;
