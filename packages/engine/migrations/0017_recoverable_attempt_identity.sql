-- Preserve the durable attempt identity of an interrupted model node.
-- Recovery can safely retry the same logical provider request instead of silently
-- allocating a new attempt while the previous request may still be in flight.
ALTER TABLE task_graph_nodes ADD COLUMN active_attempt_number INTEGER;
CREATE INDEX IF NOT EXISTS idx_graph_nodes_active_attempt
  ON task_graph_nodes(graph_id, id, active_attempt_number);
