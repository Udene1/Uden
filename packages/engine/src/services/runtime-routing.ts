import type { D1Database } from '@cloudflare/workers-types';
import type { ExecutionRuntimeCapability, ExecutionRuntimeDescriptor, ExecutionRuntimeKind } from '@ai-work-partner/shared';
import { listEligibleExecutionRuntimes } from './execution-runtimes';

/**
 * Chooses a concrete runtime only from server-verified, live capability advertisements.
 * `preferredKind` is a routing constraint, never a bypass around capability/heartbeat checks.
 */
export async function selectExecutionRuntime(
  db: D1Database,
  tenantId: string,
  capability: ExecutionRuntimeCapability,
  preferredKind?: ExecutionRuntimeKind,
): Promise<ExecutionRuntimeDescriptor | null> {
  const eligible = await listEligibleExecutionRuntimes(db, tenantId, capability);
  if (!preferredKind) return eligible[0] ?? null;
  return eligible.find(runtime => runtime.kind === preferredKind) ?? null;
}
