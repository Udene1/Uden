import type { Env } from '../types';

const MAX_FILE_BYTES = 500_000;
const MAX_FILES = 200;
const MAX_OUTPUT = 100_000;

export interface ProjectFile { path: string; content: string; version: number; contentSha256: string; }
export interface RuntimeResult { jobId: string; status: 'queued' | 'running' | 'succeeded' | 'failed'; exitCode?: number; output?: string; }

function requireRuntime(env: Env): { url: string; secret: string } {
  if (!env.PROJECT_RUNTIME_URL || !env.PROJECT_RUNTIME_SECRET) throw new Error('Project runtime is not configured');
  return { url: env.PROJECT_RUNTIME_URL.replace(/\/$/, ''), secret: env.PROJECT_RUNTIME_SECRET };
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
  let binary = ''; for (const byte of digest) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function validatePath(path: string): string {
  const normalized = path.trim().replace(/\\/g, '/');
  if (!normalized || normalized.startsWith('/') || normalized.includes('..') || normalized.includes('\0')) throw new Error('Invalid project file path');
  if (normalized.length > 500) throw new Error('Project file path is too long');
  return normalized;
}

export async function listProjectFiles(env: Env, tenantId: string, projectId: string): Promise<ProjectFile[]> {
  const result = await env.DB.prepare('SELECT path,content,version,content_sha256 FROM project_files WHERE tenant_id=? AND project_id=? ORDER BY path LIMIT ?').bind(tenantId, projectId, MAX_FILES).all<{ path: string; content: string; version: number; content_sha256: string }>();
  return (result.results || []).map(row => ({ path: row.path, content: row.content, version: row.version, contentSha256: row.content_sha256 }));
}

export async function upsertProjectFile(env: Env, tenantId: string, projectId: string, path: string, content: string, expectedVersion?: number): Promise<ProjectFile> {
  const safePath = validatePath(path);
  if (content.length > MAX_FILE_BYTES) throw new Error('Project file exceeds size limit');
  const existing = await env.DB.prepare('SELECT id,version FROM project_files WHERE tenant_id=? AND project_id=? AND path=?').bind(tenantId, projectId, safePath).first<{ id: string; version: number }>();
  const version = existing ? existing.version + 1 : 1;
  if (expectedVersion !== undefined && (!existing || existing.version !== expectedVersion)) throw new Error('Project file version conflict');
  const key = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
  let binary = ''; for (const byte of new Uint8Array(key)) binary += String.fromCharCode(byte);
  const contentSha256 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  await env.DB.prepare(`INSERT INTO project_files (id,tenant_id,project_id,path,content,content_sha256,version) VALUES (?,?,?,?,?,?,?) ON CONFLICT(project_id,path) DO UPDATE SET content=excluded.content,content_sha256=excluded.content_sha256,version=excluded.version,updated_at=CURRENT_TIMESTAMP`).bind(existing?.id || crypto.randomUUID(), tenantId, projectId, safePath, content, contentSha256, version).run();
  return { path: safePath, content, version, contentSha256 };
}

export async function runProjectCommand(env: Env, tenantId: string, projectId: string, command: string, files: ProjectFile[]): Promise<RuntimeResult> {
  const runtime = requireRuntime(env);
  const safeCommand = command.trim();
  if (!safeCommand || safeCommand.length > 2_000 || /[\r\n]/.test(safeCommand)) throw new Error('Invalid project runtime command');
  if (files.length > MAX_FILES) throw new Error('Too many project files');
  const payload = JSON.stringify({ tenantId, projectId, command: safeCommand, files: files.map(file => ({ path: validatePath(file.path), content: file.content })) });
  const timestamp = String(Date.now());
  const signature = await sign(`${timestamp}.${payload}`, runtime.secret);
  const response = await fetch(`${runtime.url}/v1/projects/run`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-uden-timestamp': timestamp, 'x-uden-signature': signature }, body: payload });
  if (!response.ok) throw new Error('Project runtime execution failed');
  const result = await response.json() as RuntimeResult;
  if (!result.jobId || !['queued','running','succeeded','failed'].includes(result.status)) throw new Error('Project runtime returned an invalid result');
  return { ...result, output: result.output?.slice(0, MAX_OUTPUT) };
}
