-- Repository side effects already have idempotency keys. These guards ensure
-- the durable identity behind a key cannot be rewritten after authorization.
DROP TRIGGER IF EXISTS repository_operation_identity_guard;
CREATE TRIGGER repository_operation_identity_guard
BEFORE UPDATE OF tenant_id,graph_id,node_id,execution_owner,execution_version,provider,repository_owner,repository_name,branch,operation,expected_head_sha,idempotency_key ON repository_operations
WHEN OLD.tenant_id<>NEW.tenant_id OR OLD.graph_id<>NEW.graph_id OR OLD.node_id<>NEW.node_id OR OLD.execution_owner<>NEW.execution_owner OR OLD.execution_version<>NEW.execution_version OR OLD.provider<>NEW.provider OR OLD.repository_owner<>NEW.repository_owner OR OLD.repository_name<>NEW.repository_name OR COALESCE(OLD.branch,'')<>COALESCE(NEW.branch,'') OR OLD.operation<>NEW.operation OR COALESCE(OLD.expected_head_sha,'')<>COALESCE(NEW.expected_head_sha,'') OR OLD.idempotency_key<>NEW.idempotency_key
BEGIN SELECT RAISE(ABORT,'Repository operation identity is immutable'); END;

DROP TRIGGER IF EXISTS repository_operation_terminal_guard;
CREATE TRIGGER repository_operation_terminal_guard
BEFORE UPDATE ON repository_operations
WHEN OLD.status IN ('completed','failed')
 AND (NEW.status<>OLD.status OR COALESCE(NEW.result_sha,'')<>COALESCE(OLD.result_sha,'') OR COALESCE(NEW.pull_request_number,-1)<>COALESCE(OLD.pull_request_number,-1) OR COALESCE(NEW.error,'')<>COALESCE(OLD.error,''))
BEGIN SELECT RAISE(ABORT,'Terminal repository operation cannot be rewritten'); END;
