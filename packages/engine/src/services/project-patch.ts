import type { Env } from '../types';
import { upsertProjectFile } from './project-runtime';
import { assertExecutionFence, type ExecutionFence } from './execution-side-effects';

const MAX_PATCH_FILES = 20;
const MAX_PATCH_BYTES = 2_000_000;

export interface ProjectPatchInput { path: string; content: string; expectedVersion?: number; }
export interface ProjectPatchResult { path: string; version: number; contentSha256: string; }

function validatePatch(inputs: ProjectPatchInput[]): void {
  if (!Array.isArray(inputs) || inputs.length === 0 || inputs.length > MAX_PATCH_FILES) throw new Error('Invalid project patch');
  const total = inputs.reduce((sum, file) => sum + (typeof file.content === 'string' ? file.content.length : 0), 0);
  if (total > MAX_PATCH_BYTES) throw new Error('Project patch exceeds size limit');
  if (new Set(inputs.map(file => file.path)).size !== inputs.length) throw new Error('Project patch contains duplicate paths');
  if (inputs.some(file => !Number.isInteger(file.expectedVersion) || (file.expectedVersion as number) < 0)) throw new Error('Project patch requires an expected version for every file');
}

export async function applyProjectPatch(env: Env, tenantId: string, projectId: string, inputs: ProjectPatchInput[], fence: ExecutionFence): Promise<ProjectPatchResult[]> {
  validatePatch(inputs);
  if (!fence.tenantId || !fence.graphId) throw new Error('Execution fence identity is required');
  await assertExecutionFence(env.DB, tenantId, fence.graphId, fence);
  const results: ProjectPatchResult[] = [];
  for (const file of inputs) {
    const updated = await upsertProjectFile(env, tenantId, projectId, file.path, file.content, file.expectedVersion, fence);
    results.push({ path: updated.path, version: updated.version, contentSha256: updated.contentSha256 });
    const patch = await env.DB.prepare(`
      INSERT INTO project_patches (id,tenant_id,project_id,path,base_version,content_sha256,status)
      SELECT ?,?,?,?,?,?,'applied'
      WHERE EXISTS (
        SELECT 1 FROM task_graphs
        WHERE id=? AND tenant_id=? AND execution_owner=? AND execution_version=? AND lease_until>=CURRENT_TIMESTAMP
      )
    `).bind(crypto.randomUUID(), tenantId, projectId, updated.path, file.expectedVersion, updated.contentSha256, fence.graphId, tenantId, fence.owner, fence.fenceVersion).run();
    if (!patch.meta?.changes) throw new Error('Execution fence lost while recording project patch');
  }
  return results;
}
