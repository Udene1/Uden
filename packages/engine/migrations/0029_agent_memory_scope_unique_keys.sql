-- SQLite NULLs do not collide in a composite UNIQUE index. Use scope-specific partial indexes instead.
DROP INDEX IF EXISTS idx_agent_memories_identity;
DROP INDEX IF EXISTS idx_agent_memories_scope_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_memories_tenant_key
  ON agent_memories(tenant_id, scope, key)
  WHERE scope='tenant';
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_memories_project_key
  ON agent_memories(tenant_id, project_id, scope, key)
  WHERE scope='project';
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_memories_graph_key
  ON agent_memories(tenant_id, graph_id, scope, key)
  WHERE scope='graph';
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_memories_node_key
  ON agent_memories(tenant_id, graph_id, node_id, scope, key)
  WHERE scope='node';
