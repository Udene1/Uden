ALTER TABLE task_graph_nodes ADD COLUMN approval_required INTEGER NOT NULL DEFAULT 0;
ALTER TABLE task_graph_nodes ADD COLUMN approval_state TEXT NOT NULL DEFAULT 'not-required' CHECK(approval_state IN ('not-required','pending','approved','rejected'));
ALTER TABLE task_graph_nodes ADD COLUMN approval_reason TEXT;
ALTER TABLE task_graph_nodes ADD COLUMN approved_by TEXT;
ALTER TABLE task_graph_nodes ADD COLUMN approved_at TEXT;
CREATE INDEX IF NOT EXISTS idx_task_graph_nodes_approval ON task_graph_nodes(tenant_id, status, approval_state);
