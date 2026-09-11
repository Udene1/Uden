import type { Env } from '../types';
import {
  getGitHubBlob,
  getGitHubCommit,
  getGitHubGitCommit,
  getGitHubTreeBySha,
  getGitHubRef,
} from './github-connector';

export type GitHubBatchObject =
  | { type: 'blob'; sha: string }
  | { type: 'commit'; sha: string }
  | { type: 'git-commit'; sha: string }
  | { type: 'tree'; sha: string }
  | { type: 'ref'; ref: string };

export interface GitHubBatchResult {
  index: number;
  object: GitHubBatchObject;
  ok: true;
  value: unknown;
}

export interface GitHubBatchFailure {
  index: number;
  object: GitHubBatchObject;
  ok: false;
  error: string;
}

const MAX_OBJECTS = 32;

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : 'GitHub object read failed';
}

async function readObject(env: Env, tenantId: string, owner: string, repo: string, object: GitHubBatchObject): Promise<unknown> {
  switch (object.type) {
    case 'blob':
      return getGitHubBlob(env, tenantId, owner, repo, object.sha);
    case 'commit':
      return getGitHubCommit(env, tenantId, owner, repo, object.sha);
    case 'git-commit':
      return getGitHubGitCommit(env, tenantId, owner, repo, object.sha);
    case 'tree':
      return getGitHubTreeBySha(env, tenantId, owner, repo, object.sha);
    case 'ref':
      return getGitHubRef(env, tenantId, owner, repo, object.ref);
  }
}

/**
 * Read independent Git objects concurrently. This is intentionally a read-only
 * primitive: immutable SHA-addressed objects can be fetched in parallel without
 * creating new repository state or hiding partial failures.
 */
export async function readGitHubObjectsBatch(
  env: Env,
  tenantId: string,
  owner: string,
  repo: string,
  objects: GitHubBatchObject[],
): Promise<{ results: GitHubBatchResult[]; failures: GitHubBatchFailure[] }> {
  if (!Array.isArray(objects) || objects.length === 0) throw new Error('At least one GitHub object is required');
  if (objects.length > MAX_OBJECTS) throw new Error(`GitHub batch is limited to ${MAX_OBJECTS} objects`);

  const settled = await Promise.allSettled(
    objects.map(async (object, index) => ({ index, object, value: await readObject(env, tenantId, owner, repo, object) })),
  );

  const results: GitHubBatchResult[] = [];
  const failures: GitHubBatchFailure[] = [];
  for (const [index, outcome] of settled.entries()) {
    const object = objects[index];
    if (outcome.status === 'fulfilled') results.push({ index, object, ok: true, value: outcome.value.value });
    else failures.push({ index, object, ok: false, error: normalizeError(outcome.reason) });
  }
  return { results, failures };
}
