import type { Env } from '../types';
import { getSandbox } from '@cloudflare/sandbox';

const MAX_FILE_BYTES = 500_000;
const MAX_FILES = 200;
const MAX_OUTPUT = 100_000;
const MAX_SEARCH_RESULTS = 100;
const MAX_SEARCH_QUERY = 200;
const SANDBOX_ROOT = '/workspace/projects';

export interface ProjectFile { path: string; content: string; version: number; contentSha256: string; }
export type RuntimeStatus = 'queued' | 'running' | 'succeeded' | 'failed';
export interface RuntimeResult { jobId: string; status: RuntimeStatus; exitCode?: number; output?: string; }
export interface ProjectSearchMatch { path: string; line: number; text: string; }

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

export async function searchProjectFiles(env: Env, tenantId: string, projectId: string, query: string): Promise<ProjectSearchMatch[]> {
  const needle = query.trim();
  if (!needle || needle.length > MAX_SEARCH_QUERY) throw new Error('Invalid project search query');
  const result = await env.DB.prepare('SELECT path,content FROM project_files WHERE tenant_id=? AND project_id=? ORDER BY path LIMIT ?').bind(tenantId, projectId, MAX_FILES).all<{ path: string; content: string }>();
  const matches: ProjectSearchMatch[] = [];
  const lowerNeedle = needle.toLowerCase();
  for (const file of result.results || []) {
    const lines = file.content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      if (lines[index].toLowerCase().includes(lowerNeedle)) {
        matches.push({ path: file.path, line: index + 1, text: lines[index].slice(0, 1_000) });
        if (matches.length >= MAX_SEARCH_RESULTS) return matches;
      }
    }
  }
  return matches;
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

function sandboxId(tenantId: string, projectId: string): string { return `uden-${tenantId}-${projectId}`.slice(0, 256); }
function sandboxJobId(id: string, processId: string): string { return `sandbox:${encodeURIComponent(id)}:${encodeURIComponent(processId)}`; }
function parseSandboxJobId(jobId: string): { id: string; processId: string } | null {
  if (!jobId.startsWith('sandbox:')) return null;
  const parts = jobId.split(':');
  if (parts.length !== 3) return null;
  return { id: decodeURIComponent(parts[1]), processId: decodeURIComponent(parts[2]) };
}

async function runInSandbox(env: Env, tenantId: string, projectId: string, command: string, files: ProjectFile[]): Promise<RuntimeResult> {
  const id = sandboxId(tenantId, projectId);
  const sandbox = getSandbox(env.Sandbox, id);
  const root = `${SANDBOX_ROOT}/${projectId}`;
  await sandbox.mkdir(root, { recursive: true });
  for (const file of files) {
    const safePath = validatePath(file.path);
    const target = `${root}/${safePath}`;
    const parent = target.slice(0, target.lastIndexOf('/')) || root;
    await sandbox.mkdir(parent, { recursive: true });
    await sandbox.writeFile(target, file.content);
  }
  const process = await sandbox.exec(['/bin/bash', '-lc', command], { cwd: root, timeout: 15 * 60 * 1000 });
  return { jobId: sandboxJobId(id, process.id), status: 'running', output: `Sandbox process ${process.id} started` };
}

async function pollSandbox(env: Env, jobId: string): Promise<RuntimeResult> {
  const parsed = parseSandboxJobId(jobId);
  if (!parsed) throw new Error('Invalid sandbox runtime job id');
  const sandbox = getSandbox(env.Sandbox, parsed.id);
  const process = await sandbox.getProcess(parsed.processId);
  if (!process) return { jobId, status: 'failed', output: 'Sandbox process is no longer available; the runtime container may have been replaced before completion.' };
  const status = await process.status();
  if (status.state === 'running') return { jobId, status: 'running', output: 'Sandbox process is still running' };
  if (status.state === 'error') return { jobId, status: 'failed', output: status.error.message };
  const output = await process.output({ encoding: 'utf8' });
  const combined = `${output.stdout}${output.stderr ? `\n${output.stderr}` : ''}`.slice(0, MAX_OUTPUT);
  return { jobId, status: output.exitCode === 0 && !output.timedOut ? 'succeeded' : 'failed', exitCode: output.exitCode, output: combined };
}

async function signedRequest(env: Env, method: 'GET' | 'POST', path: string, payload?: string): Promise<RuntimeResult> {
  const runtime = requireRuntime(env);
  const timestamp = String(Date.now());
  const body = payload ?? '';
  const signature = await sign(`${timestamp}.${body}`, runtime.secret);
  const response = await fetch(`${runtime.url}${path}`, { method, headers: { ...(method === 'POST' ? { 'content-type': 'application/json' } : {}), 'x-uden-timestamp': timestamp, 'x-uden-signature': signature }, ...(method === 'POST' ? { body } : {}) });
  if (!response.ok) throw new Error('Project runtime request failed');
  const result = await response.json() as RuntimeResult;
  if (!result.jobId || !['queued','running','succeeded','failed'].includes(result.status)) throw new Error('Project runtime returned an invalid result');
  const output = result.output?.slice(0, MAX_OUTPUT);
  if (result.status === 'succeeded' && result.exitCode !== undefined && result.exitCode !== 0) return { ...result, status: 'failed', output: output || `Project runtime exited with code ${result.exitCode}` };
  return { ...result, output };
}

export async function runProjectCommand(env: Env, tenantId: string, projectId: string, command: string, files: ProjectFile[]): Promise<RuntimeResult> {
  const safeCommand = command.trim();
  if (!safeCommand || safeCommand.length > 2_000 || /[\r\n]/.test(safeCommand)) throw new Error('Invalid project runtime command');
  if (files.length > MAX_FILES) throw new Error('Too many project files');
  if (env.Sandbox) return runInSandbox(env, tenantId, projectId, safeCommand, files);
  return signedRequest(env, 'POST', '/v1/projects/run', JSON.stringify({ tenantId, projectId, command: safeCommand, files: files.map(file => ({ path: validatePath(file.path), content: file.content })) }));
}

export async function getProjectRuntimeJob(env: Env, tenantId: string, projectId: string, jobId: string): Promise<RuntimeResult> {
  if (jobId.startsWith('sandbox:')) return pollSandbox(env, jobId);
  if (!/^[A-Za-z0-9._:-]{1,200}$/.test(jobId)) throw new Error('Invalid project runtime job id');
  return signedRequest(env, 'GET', `/v1/projects/jobs/${encodeURIComponent(jobId)}?tenantId=${encodeURIComponent(tenantId)}&projectId=${encodeURIComponent(projectId)}`, `${tenantId}.${projectId}.${jobId}`);
}
