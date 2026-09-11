-- Tighten durable memory identity so equal keys in different projects/graphs/nodes do not collide.
DROP INDEX IF EXISTS idx_agent_memories_scope_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_memories_identity
  ON agent_memories(tenant_id, scope, project_id, graph_id, node_id, key);

CREATE INDEX IF NOT EXISTS idx_agent_memories_tenant_scope_updated
  ON agent_memories(tenant_id, scope, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memories_project_scope_updated
  ON agent_memories(tenant_id, project_id, scope, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memories_graph_scope_updated
  ON agent_memories(tenant_id, graph_id, scope, updated_at DESC);
