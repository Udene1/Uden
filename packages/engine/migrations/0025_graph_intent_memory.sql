-- Persist graph execution intent and durable agent memory.
ALTER TABLE task_graph_nodes ADD COLUMN runtime_capability TEXT;
ALTER TABLE task_graph_nodes ADD COLUMN preferred_runtime_kind TEXT;
ALTER TABLE task_graph_nodes ADD COLUMN risk_level TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE task_graph_nodes ADD COLUMN latency_preference TEXT NOT NULL DEFAULT 'balanced';
CREATE INDEX IF NOT EXISTS idx_graph_nodes_runtime_capability ON task_graph_nodes(tenant_id,runtime_capability,status);

CREATE TABLE IF NOT EXISTS agent_memories (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  project_id TEXT,
  graph_id TEXT,
  node_id TEXT,
  kind TEXT NOT NULL,
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  content TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  confidence REAL NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_memories_scope_key ON agent_memories(tenant_id,scope,key);
CREATE INDEX IF NOT EXISTS idx_agent_memories_project ON agent_memories(tenant_id,project_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memories_graph ON agent_memories(tenant_id,graph_id,updated_at DESC);
