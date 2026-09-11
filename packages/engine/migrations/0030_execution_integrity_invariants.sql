-- Execution-integrity invariants. These are database guards, not executor conventions.
DROP TRIGGER IF EXISTS task_graph_nodes_status_transition_guard;
CREATE TRIGGER task_graph_nodes_status_transition_guard
BEFORE UPDATE OF status ON task_graph_nodes
WHEN OLD.status <> NEW.status
 AND NOT (
   (OLD.status='pending' AND NEW.status IN ('ready','running','blocked','awaiting-approval')) OR
   (OLD.status='ready' AND NEW.status IN ('running','blocked','awaiting-approval','awaiting-runtime')) OR
   (OLD.status='running' AND NEW.status IN ('completed','failed','blocked','awaiting-approval','awaiting-runtime','awaiting-reconciliation','ready','pending')) OR
   (OLD.status='awaiting-runtime' AND NEW.status IN ('running','completed','failed','blocked','awaiting-reconciliation')) OR
   (OLD.status='awaiting-reconciliation' AND NEW.status IN ('running','completed','failed','blocked','awaiting-approval')) OR
   (OLD.status='awaiting-approval' AND NEW.status IN ('ready','running','blocked','failed')) OR
   (OLD.status='failed' AND NEW.status IN ('running','failed','awaiting-approval')) OR
   (OLD.status='blocked' AND NEW.status IN ('running','blocked','pending')) OR
   (OLD.status='completed' AND NEW.status='completed')
 )
BEGIN SELECT RAISE(ABORT, 'Illegal task graph node status transition'); END;

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
BEGIN SELECT RAISE(ABORT, 'Illegal task graph status transition'); END;

DROP TRIGGER IF EXISTS task_graph_terminal_provider_guard;
CREATE TRIGGER task_graph_terminal_provider_guard
BEFORE UPDATE OF status ON task_graphs
WHEN NEW.status IN ('completed','failed','blocked')
 AND EXISTS (SELECT 1 FROM task_graph_attempts WHERE graph_id=NEW.id AND tenant_id=NEW.tenant_id AND external_outcome IN ('in_flight','possibly_succeeded','unknown'))
BEGIN SELECT RAISE(ABORT, 'Graph cannot become terminal with unresolved provider side effects'); END;

DROP TRIGGER IF EXISTS task_graph_terminal_unknown_guard;
CREATE TRIGGER task_graph_terminal_unknown_guard
BEFORE UPDATE OF status ON task_graphs
WHEN NEW.status IN ('completed','failed','blocked')
 AND EXISTS (SELECT 1 FROM repository_operations WHERE graph_id=NEW.id AND tenant_id=NEW.tenant_id AND external_outcome IN ('in_flight','unknown'))
BEGIN SELECT RAISE(ABORT, 'Graph cannot become terminal with unresolved repository side effects'); END;

-- The runtime terminal guard intentionally lives in migration 0032, after
-- runtime_executions has its final schema from migration 0031. Keeping this
-- dependency explicit prevents fresh databases from carrying a trigger that
-- references a table whose schema has not been established yet.
