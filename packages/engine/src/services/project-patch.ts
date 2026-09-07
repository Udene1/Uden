import type { Env } from '../types';
import { upsertProjectFile } from './project-runtime';

const MAX_PATCH_FILES = 20;
const MAX_PATCH_BYTES = 2_000_000;

export interface ProjectPatchInput { path: string; content: string; expectedVersion?: number; }
export interface ProjectPatchResult { path: string; version: number; contentSha256: string; }

function validatePatch(inputs: ProjectPatchInput[]): void {
  if (!Array.isArray(inputs) || inputs.length === 0 || inputs.length > MAX_PATCH_FILES) throw new Error('Invalid project patch');
  const total = inputs.reduce((sum, file) => sum + (typeof file.content === 'string' ? file.content.length : 0), 0);
  if (total > MAX_PATCH_BYTES) throw new Error('Project patch exceeds size limit');
  if (new Set(inputs.map(file => file.path)).size !== inputs.length) throw new Error('Project patch contains duplicate paths');
}

export async function applyProjectPatch(env: Env, tenantId: string, projectId: string, inputs: ProjectPatchInput[]): Promise<ProjectPatchResult[]> {
  validatePatch(inputs);
  const results: ProjectPatchResult[] = [];
  for (const file of inputs) {
    const updated = await upsertProjectFile(env, tenantId, projectId, file.path, file.content, file.expectedVersion);
    results.push({ path: updated.path, version: updated.version, contentSha256: updated.contentSha256 });
    await env.DB.prepare('INSERT OR IGNORE INTO project_patches (id,tenant_id,project_id,path,base_version,content_sha256,status) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(), tenantId, projectId, updated.path, file.expectedVersion ?? updated.version - 1, updated.contentSha256, 'applied').run();
  }
  return results;
}
