import type { Env } from '../types';
import { listProjectFiles, searchProjectFiles, runProjectCommand, type ProjectFile, type RuntimeResult } from './project-runtime';
import { applyProjectPatch, type ProjectPatchInput, type ProjectPatchResult } from './project-patch';
import { fetchGitHubRawFile, fetchGitHubBlob, fetchGitHubTree } from './repository-capabilities';

const MAX_READ_BYTES = 200_000;
const MAX_DIFF_LINES = 400;

export interface ProjectContextFile { path: string; version: number; contentSha256: string; size: number; }
export interface ProjectDiffLine { type: 'context' | 'add' | 'remove'; line?: number; text: string; }
export interface ProjectDiff { path: string; baseVersion: number | null; lines: ProjectDiffLine[]; truncated: boolean; }

function safePath(path: string): string {
  const normalized = path.trim().replace(/\\/g, '/');
  if (!normalized || normalized.startsWith('/') || normalized.includes('..') || normalized.includes('\0') || normalized.length > 500) throw new Error('Invalid project file path');
  return normalized;
}

export async function readProjectFile(env: Env, tenantId: string, projectId: string, path: string): Promise<ProjectFile> {
  const normalized = safePath(path);
  const row = await env.DB.prepare('SELECT path,content,version,content_sha256 FROM project_files WHERE tenant_id=? AND project_id=? AND path=?').bind(tenantId, projectId, normalized).first<{ path: string; content: string; version: number; content_sha256: string }>();
  if (!row) throw new Error('Project file not found');
  if (row.content.length > MAX_READ_BYTES) throw new Error('Project file exceeds read limit');
  return { path: row.path, content: row.content, version: row.version, contentSha256: row.content_sha256 };
}

export async function projectTree(env: Env, tenantId: string, projectId: string): Promise<ProjectContextFile[]> {
  const files = await listProjectFiles(env, tenantId, projectId);
  return files.map(file => ({ path: file.path, version: file.version, contentSha256: file.contentSha256, size: file.content.length }));
}

function diffLines(base: string[], next: string[]): { lines: ProjectDiffLine[]; truncated: boolean } {
  const n = base.length, m = next.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = base[i] === next[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: ProjectDiffLine[] = [];
  let i = 0, j = 0;
  while (i < n && j < m && out.length < MAX_DIFF_LINES) {
    if (base[i] === next[j]) { out.push({ type: 'context', line: i + 1, text: base[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ type: 'remove', line: i + 1, text: base[i++] });
    else out.push({ type: 'add', text: next[j++] });
  }
  while (i < n && out.length < MAX_DIFF_LINES) out.push({ type: 'remove', line: i + 1, text: base[i++] });
  while (j < m && out.length < MAX_DIFF_LINES) out.push({ type: 'add', text: next[j++] });
  return { lines: out, truncated: i < n || j < m };
}

export async function previewProjectDiff(env: Env, tenantId: string, projectId: string, path: string, content: string, expectedVersion?: number): Promise<ProjectDiff> {
  const normalized = safePath(path);
  if (content.length > MAX_READ_BYTES) throw new Error('Project file exceeds diff limit');
  let current: ProjectFile | null = null;
  try { current = await readProjectFile(env, tenantId, projectId, normalized); } catch (error) { if (!(error instanceof Error) || error.message !== 'Project file not found') throw error; }
  if (expectedVersion !== undefined && current?.version !== expectedVersion) throw new Error('Project file version conflict');
  const diff = diffLines((current?.content ?? '').split(/\r?\n/), content.split(/\r?\n/));
  return { path: normalized, baseVersion: current?.version ?? null, ...diff };
}

export type ProjectTool =
  | { name: 'tree'; input: Record<string, never> }
  | { name: 'read'; input: { path: string } }
  | { name: 'search'; input: { query: string } }
  | { name: 'diff'; input: { path: string; content: string; expectedVersion?: number } }
  | { name: 'patch'; input: { files: ProjectPatchInput[] } }
  | { name: 'execute'; input: { command: string } }
  | { name: 'github-raw'; input: { owner: string; repo: string; ref?: string; path: string } }
  | { name: 'github-blob'; input: { owner: string; repo: string; sha: string } }
  | { name: 'github-tree'; input: { owner: string; repo: string; ref?: string } };

export async function executeProjectTool(env: Env, tenantId: string, projectId: string, tool: ProjectTool): Promise<unknown> {
  switch (tool.name) {
    case 'tree': return projectTree(env, tenantId, projectId);
    case 'read': return readProjectFile(env, tenantId, projectId, tool.input.path);
    case 'search': return searchProjectFiles(env, tenantId, projectId, tool.input.query);
    case 'diff': return previewProjectDiff(env, tenantId, projectId, tool.input.path, tool.input.content, tool.input.expectedVersion);
    case 'patch': return applyProjectPatch(env, tenantId, projectId, tool.input.files);
    case 'execute': return runProjectCommand(env, tenantId, projectId, tool.input.command, await listProjectFiles(env, tenantId, projectId));
    case 'github-raw': return fetchGitHubRawFile(env, tool.input, tool.input.path);
    case 'github-blob': return fetchGitHubBlob(env, tool.input, tool.input.sha);
    case 'github-tree': return fetchGitHubTree(env, tool.input);
    default: throw new Error('Unsupported project tool');
  }
}

export type { ProjectPatchInput, ProjectPatchResult, RuntimeResult };
