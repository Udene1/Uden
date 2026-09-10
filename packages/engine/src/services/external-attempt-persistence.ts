import type { ExternalAttemptOutcome } from './external-attempts';
import type { ExecutionFence } from './execution-side-effects';

export async function markExternalAttemptInFlight(
  db: D1Database,
  tenantId: string,
  attemptId: string,
  idempotencyKey: string,
  fence: ExecutionFence,
): Promise<void> {
  const row = await db.prepare(`
    UPDATE task_graph_attempts
    SET external_outcome='in_flight',
        idempotency_key=?,
        outcome_checked_at=CURRENT_TIMESTAMP,
        external_error=NULL
    WHERE id=?
      AND tenant_id=?
      AND EXISTS (
        SELECT 1
        FROM task_graphs
        WHERE id=task_graph_attempts.graph_id
          AND tenant_id=?
          AND execution_owner=?
          AND execution_version=?
          AND lease_until>=CURRENT_TIMESTAMP
      )
    RETURNING id
  `).bind(idempotencyKey, attemptId, tenantId, tenantId, fence.owner, fence.fenceVersion).first<{ id: string }>();

  if (!row) throw new Error('Graph execution lease lost before external attempt');
}

export async function markExternalAttemptOutcome(
  db: D1Database,
  tenantId: string,
  attemptId: string,
  outcome: ExternalAttemptOutcome,
  fence: ExecutionFence,
  error?: string,
): Promise<void> {
  const row = await db.prepare(`
    UPDATE task_graph_attempts
    SET external_outcome=?,
        outcome_checked_at=CURRENT_TIMESTAMP,
        external_error=?
    WHERE id=?
      AND tenant_id=?
      AND EXISTS (
        SELECT 1
        FROM task_graphs
        WHERE id=task_graph_attempts.graph_id
          AND tenant_id=?
          AND execution_owner=?
          AND execution_version=?
          AND lease_until>=CURRENT_TIMESTAMP
      )
    RETURNING id
  `).bind(outcome, error?.slice(0, 500) || null, attemptId, tenantId, tenantId, fence.owner, fence.fenceVersion).first<{ id: string }>();

  if (!row) throw new Error('Graph execution lease lost while recording external outcome');
}

export async function getExternalAttemptOutcome(
  db: D1Database,
  tenantId: string,
  attemptId: string,
): Promise<{ outcome: ExternalAttemptOutcome; idempotencyKey: string | null; externalError: string | null } | null> {
  const row = await db.prepare(`
    SELECT external_outcome, idempotency_key, external_error
    FROM task_graph_attempts
    WHERE id=? AND tenant_id=?
  `).bind(attemptId, tenantId).first<{ external_outcome: ExternalAttemptOutcome; idempotency_key: string | null; external_error: string | null }>();

  if (!row) return null;
  return {
    outcome: row.external_outcome,
    idempotencyKey: row.idempotency_key,
    externalError: row.external_error,
  };
}
