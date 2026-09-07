ALTER TABLE task_graph_nodes ADD COLUMN runtime_job_id TEXT;
CREATE INDEX IF NOT EXISTS idx_task_graph_nodes_runtime_job ON task_graph_nodes(runtime_job_id);
