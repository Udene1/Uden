import type { D1Database } from '@cloudflare/workers-types';
import type { Env } from '../types';
import { getCodeSource, type CodeRepositoryRef, type CodeFileChange, type CodeMutationPrecondition } from './code-source';
import {
  authorizeRepositoryOperation,
  markRepositoryOperationInFlight,
  completeRepositoryOperation,
  failRepositoryOperation,
  markRepositoryOperationUnknown,
  type RepositoryOperationInput,
  type RepositoryOperationRecord,
} from './repository-operations';

export interface RepositoryOperationContext {
  db: D1Database;
  env: Env;
  tenantId: string;
  graphId: string;
  nodeId: string;
  executionOwner: string;
  executionVersion: number;
  repository: CodeRepositoryRef;
  idempotencyKey: string;
}

export interface RepositoryMutationResult {
  resultSha?: string;
  pullRequestNumber?: number;
}

type Mutation = (source: ReturnType<typeof getCodeSource>, ctx: RepositoryOperationContext) => Promise<RepositoryMutationResult>;

async function run(ctx: RepositoryOperationContext, operation: RepositoryOperationInput['operation'], mutation: Mutation): Promise<RepositoryOperationRecord> {
  const op: RepositoryOperationInput = {
    id: crypto.randomUUID(), tenantId: ctx.tenantId, graphId: ctx.graphId, nodeId: ctx.nodeId,
    executionOwner: ctx.executionOwner, executionVersion: ctx.executionVersion, repository: ctx.repository,
    operation, idempotencyKey: ctx.idempotencyKey,
  };
  const authorized = await authorizeRepositoryOperation(ctx.db, op);
  if (authorized.status === 'completed') return authorized;
  if (authorized.status === 'unknown') throw new Error(`Repository operation ${authorized.id} has unknown external outcome and must be reconciled before retry`);
  if (authorized.status === 'in_flight') throw new Error(`Repository operation ${authorized.id} is already in flight`);

  const inFlight = await markRepositoryOperationInFlight(ctx.db, { ...op, id: authorized.id, idempotencyKey: authorized.idempotencyKey });
  const source = getCodeSource(ctx.repository.provider);
  try {
    const result = await mutation(source, ctx);
    return await completeRepositoryOperation(ctx.db, { ...op, id: inFlight.id, idempotencyKey: inFlight.idempotencyKey }, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // A mutation may have been accepted remotely before the response failed. Callers must classify
    // ambiguous transport failures as UNKNOWN rather than manufacturing a safe-to-retry failure.
    if (/timeout|timed out|network|fetch failed|connection|ECONN|ETIMEDOUT|502|503|504/i.test(message)) {
      return markRepositoryOperationUnknown(ctx.db, { ...op, id: inFlight.id, idempotencyKey: inFlight.idempotencyKey }, message);
    }
    return failRepositoryOperation(ctx.db, { ...op, id: inFlight.id, idempotencyKey: inFlight.idempotencyKey }, message);
  }
}

export async function executeRepositoryCommit(ctx: RepositoryOperationContext, branch: string, changes: CodeFileChange[], precondition: CodeMutationPrecondition, message: string): Promise<RepositoryOperationRecord> {
  return run(ctx, 'commit_files', async (source, current) => {
    const result = await source.commitFiles(current.env, current.tenantId, current.repository, branch, changes, precondition, message) as { sha?: string };
    return { resultSha: result?.sha };
  });
}

export async function executeRepositoryBranch(ctx: RepositoryOperationContext, branch: string, fromSha: string): Promise<RepositoryOperationRecord> {
  return run(ctx, 'create_branch', async (source, current) => {
    const result = await source.createBranch(current.env, current.tenantId, current.repository, branch, fromSha) as { object?: { sha?: string } };
    return { resultSha: result?.object?.sha };
  });
}

export async function executeRepositoryPullRequest(ctx: RepositoryOperationContext, head: string, base: string, title: string, body: string): Promise<RepositoryOperationRecord> {
  return run(ctx, 'create_pull_request', async (source, current) => {
    const result = await source.createPullRequest(current.env, current.tenantId, current.repository, head, base, title, body) as { number?: number; head?: { sha?: string } };
    return { resultSha: result?.head?.sha, pullRequestNumber: result?.number };
  });
}

export async function executeRepositoryMerge(ctx: RepositoryOperationContext, number: number, expectedHeadSha: string): Promise<RepositoryOperationRecord> {
  return run(ctx, 'merge_pull_request', async (source, current) => {
    const result = await source.mergePullRequest(current.env, current.tenantId, current.repository, number, { expectedHeadSha }) as { sha?: string };
    return { resultSha: result?.sha, pullRequestNumber: number };
  });
}
