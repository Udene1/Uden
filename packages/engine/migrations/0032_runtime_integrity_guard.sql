-- Runtime terminal integrity guard.
-- Migration 0030 intentionally avoids this trigger because runtime_executions
-- is finalized by migration 0031. This migration is safe for both fresh and
-- already-migrated databases because it replaces any earlier copy.
DROP TRIGGER IF EXISTS task_graph_terminal_runtime_guard;
CREATE TRIGGER task_graph_terminal_runtime_guard
BEFORE UPDATE OF status ON task_graphs
WHEN NEW.status IN ('completed','failed','blocked')
 AND EXISTS (SELECT 1 FROM runtime_executions WHERE graph_id=NEW.id AND tenant_id=NEW.tenant_id AND status IN ('in_flight','possibly_succeeded','unknown'))
BEGIN SELECT RAISE(ABORT, 'Graph cannot become terminal with unresolved runtime side effects'); END;
