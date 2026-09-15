-- New attempts must belong to the graph generation that is currently authoritative.
DROP TRIGGER IF EXISTS task_graph_attempt_generation_insert_guard;
CREATE TRIGGER task_graph_attempt_generation_insert_guard
BEFORE INSERT ON task_graph_attempts
WHEN EXISTS (SELECT 1 FROM task_graphs g WHERE g.id=NEW.graph_id AND g.tenant_id=NEW.tenant_id AND COALESCE(NEW.execution_version,0)<>COALESCE(g.execution_version,0))
BEGIN SELECT RAISE(ABORT,'Task graph attempt generation is stale'); END;

DROP TRIGGER IF EXISTS task_graph_attempt_generation_update_guard;
CREATE TRIGGER task_graph_attempt_generation_update_guard
BEFORE UPDATE OF graph_id,execution_version ON task_graph_attempts
WHEN OLD.graph_id<>NEW.graph_id OR COALESCE(OLD.execution_version,0)<>COALESCE(NEW.execution_version,0)
BEGIN SELECT RAISE(ABORT,'Task graph attempt generation is immutable'); END;

-- A high-risk runtime capability is executable only when a durable approval for
-- the graph node exists. Application policy remains advisory; this is the DB
-- boundary that prevents an indirect tool from bypassing approval.
DROP TRIGGER IF EXISTS runtime_execution_capability_approval_guard;
CREATE TRIGGER runtime_execution_capability_approval_guard
BEFORE INSERT ON runtime_executions
WHEN NEW.capability IN ('filesystem.write','git.write','network.outbound')
 AND NOT EXISTS (
   SELECT 1 FROM graph_approval_requests a
   WHERE a.tenant_id=NEW.tenant_id
     AND a.graph_id=NEW.graph_id
     AND a.node_id=NEW.node_id
     AND a.status='approved'
 )
BEGIN SELECT RAISE(ABORT,'High-risk runtime capability requires durable approval'); END;

DROP TRIGGER IF EXISTS runtime_execution_capability_approval_update_guard;
CREATE TRIGGER runtime_execution_capability_approval_update_guard
BEFORE UPDATE OF capability,graph_id,node_id,tenant_id ON runtime_executions
WHEN NEW.capability IN ('filesystem.write','git.write','network.outbound')
 AND NOT EXISTS (
   SELECT 1 FROM graph_approval_requests a
   WHERE a.tenant_id=NEW.tenant_id
     AND a.graph_id=NEW.graph_id
     AND a.node_id=NEW.node_id
     AND a.status='approved'
 )
BEGIN SELECT RAISE(ABORT,'High-risk runtime capability requires durable approval'); END;
