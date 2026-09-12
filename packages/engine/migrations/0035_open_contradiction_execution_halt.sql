-- An open execution contradiction invalidates the current execution model.
-- Database-level guards prevent any worker from continuing execution by
-- changing graph/node state until diagnosis, correction and validation resolve it.
DROP TRIGGER IF EXISTS execution_contradiction_node_halt;
CREATE TRIGGER execution_contradiction_node_halt
BEFORE UPDATE OF status ON task_graph_nodes
WHEN EXISTS (
  SELECT 1
  FROM execution_contradictions c
  WHERE c.tenant_id=NEW.tenant_id
    AND c.graph_id=NEW.graph_id
    AND c.status='open'
)
BEGIN
  SELECT RAISE(ABORT, 'Execution halted by unresolved contradiction');
END;

DROP TRIGGER IF EXISTS execution_contradiction_graph_halt;
CREATE TRIGGER execution_contradiction_graph_halt
BEFORE UPDATE OF status ON task_graphs
WHEN EXISTS (
  SELECT 1
  FROM execution_contradictions c
  WHERE c.tenant_id=NEW.tenant_id
    AND c.graph_id=NEW.id
    AND c.status='open'
)
BEGIN
  SELECT RAISE(ABORT, 'Graph execution halted by unresolved contradiction');
END;
