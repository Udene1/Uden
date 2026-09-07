-- Persist executable project-tool metadata so durable graph resumes preserve the original operation.
ALTER TABLE task_graph_nodes ADD COLUMN kind TEXT NOT NULL DEFAULT 'model' CHECK(kind IN ('model','project-tool'));
ALTER TABLE task_graph_nodes ADD COLUMN tool TEXT;
ALTER TABLE task_graph_nodes ADD COLUMN tool_input_json TEXT;
CREATE INDEX IF NOT EXISTS idx_task_graph_nodes_kind ON task_graph_nodes(graph_id, kind);
