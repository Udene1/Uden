import type { ExternalAttemptOutcome } from './external-attempts';
import type { ExecutionFence } from './execution-side-effects';

export async function markExternalAttemptInFlight(
  db: D1Database,
  tenantId: string,
  attemptId: string,
  idempotencyKey: string,
  fence: ExecutionFence,
  memoryContext?: string,
  memoryContextHash?: string,
): Promise<void> {
  const row = await db.prepare(`
    UPDATE task_graph_attempts
    SET external_outcome='in_flight',
        idempotency_key=?,
        memory_context=COALESCE(memory_context, ?),
        memory_context_hash=COALESCE(memory_context_hash, ?),
        outcome_checked_at=CURRENT_TIMESTAMP,
        external_error=NULL
    WHERE id=?
      AND tenant_id=?
      AND (
        external_outcome='not_started'
        OR (external_outcome IN ('in_flight','unknown','possibly_succeeded') AND idempotency_key=?)
      )
      AND EXISTS (
        SELECT 1 FROM task_graphs
        WHERE id=task_graph_attempts.graph_id AND tenant_id=?
          AND execution_owner=? AND execution_version=? AND lease_until>=CURRENT_TIMESTAMP
      )
    RETURNING id
  `).bind(idempotencyKey, memoryContext ?? null, memoryContextHash ?? null, attemptId, tenantId, idempotencyKey, tenantId, fence.owner, fence.fenceVersion).first<{ id: string }>();
  if (!row) throw new Error('Graph execution lease lost or external attempt transition rejected');
}

export async function markExternalAttemptOutcome(
  db: D1Database,
  tenantId: string,
  attemptId: string,
  outcome: ExternalAttemptOutcome,
  fence: ExecutionFence,
  error?: string,
): Promise<void> {
  const allowedFrom = outcome === 'unknown' || outcome === 'possibly_succeeded' || outcome === 'failed' || outcome === 'completed' ? ['in_flight', 'unknown', 'possibly_succeeded'] : ['in_flight'];
  const placeholders = allowedFrom.map(() => '?').join(',');
  const row = await db.prepare(`
    UPDATE task_graph_attempts SET external_outcome=?, outcome_checked_at=CURRENT_TIMESTAMP, external_error=?
    WHERE id=? AND tenant_id=? AND external_outcome IN (${placeholders})
      AND EXISTS (SELECT 1 FROM task_graphs WHERE id=task_graph_attempts.graph_id AND tenant_id=? AND execution_owner=? AND execution_version=? AND lease_until>=CURRENT_TIMESTAMP)
    RETURNING id
  `).bind(outcome, error?.slice(0, 500) || null, attemptId, tenantId, ...allowedFrom, tenantId, fence.owner, fence.fenceVersion).first<{ id: string }>();
  if (!row) throw new Error('Graph execution lease lost or external attempt outcome transition rejected');
}

export async function getExternalAttemptOutcome(
  db: D1Database,
  tenantId: string,
  attemptId: string,
): Promise<{ outcome: ExternalAttemptOutcome; idempotencyKey: string | null; externalError: string | null; memoryContext: string | null; memoryContextHash: string | null } | null> {
  const row = await db.prepare(`SELECT external_outcome, idempotency_key, external_error, memory_context, memory_context_hash FROM task_graph_attempts WHERE id=? AND tenant_id=?`).bind(attemptId, tenantId).first<{ external_outcome: ExternalAttemptOutcome; idempotency_key: string | null; external_error: string | null; memory_context: string | null; memory_context_hash: string | null }>();
  if (!row) return null;
  return { outcome: row.external_outcome, idempotencyKey: row.idempotency_key, externalError: row.external_error, memoryContext: row.memory_context, memoryContextHash: row.memory_context_hash };
}

export async function listUnresolvedExternalAttempts(
  db: D1Database,
  tenantId: string,
  graphId: string,
): Promise<Array<{ id: string; nodeId: string; attemptNumber: number; outcome: ExternalAttemptOutcome; idempotencyKey: string | null; externalError: string | null }>> {
  const result = await db.prepare(`SELECT id,node_id,attempt_number,external_outcome,idempotency_key,external_error FROM task_graph_attempts WHERE tenant_id=? AND graph_id=? AND external_outcome IN ('in_flight','possibly_succeeded','unknown') ORDER BY node_id,attempt_number`).bind(tenantId, graphId).all<{ id: string; node_id: string; attempt_number: number; external_outcome: ExternalAttemptOutcome; idempotency_key: string | null; external_error: string | null }>();
  return (result.results || []).map(row => ({ id: row.id, nodeId: row.node_id, attemptNumber: row.attempt_number, outcome: row.external_outcome, idempotencyKey: row.idempotency_key, externalError: row.external_error }));
}
