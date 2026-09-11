-- A recoverable external attempt must replay the same memory context it originally used.
ALTER TABLE task_graph_attempts ADD COLUMN memory_context TEXT;
ALTER TABLE task_graph_attempts ADD COLUMN memory_context_hash TEXT;
