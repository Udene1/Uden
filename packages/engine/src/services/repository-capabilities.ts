import type { Env } from '../types';

const GITHUB_HOSTS = new Set(['github.com', 'api.github.com', 'raw.githubusercontent.com']);
const MAX_TEXT_BYTES = 5_000_000;

export type GitHubRepositoryRef = {
  owner: string;
  repo: string;
  ref?: string;
};

export type GitHubRepositoryResource =
  | { kind: 'raw-file'; owner: string; repo: string; ref: string; path: string; content: string; bytes: number }
  | { kind: 'blob'; owner: string; repo: string; sha: string; content: string; bytes: number }
  | { kind: 'tree'; owner: string; repo: string; ref: string; entries: Array<{ path: string; type: string; sha: string; size?: number }> };

function safeSegment(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 200 || normalized.includes('..') || /[\r\n]/.test(normalized)) throw new Error(`Invalid GitHub ${label}`);
  return normalized;
}

function safePath(path: string): string {
  const normalized = path.trim().replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.length > 1000 || normalized.split('/').some(segment => segment === '..' || segment === '')) throw new Error('Invalid GitHub repository path');
  return normalized;
}

function safeSha(sha: string): string {
  const normalized = sha.trim();
  if (!/^[0-9a-f]{7,64}$/i.test(normalized)) throw new Error('Invalid Git SHA');
  return normalized;
}

function repositoryParts(input: GitHubRepositoryRef): Required<GitHubRepositoryRef> {
  return { owner: safeSegment(input.owner, 'owner'), repo: safeSegment(input.repo, 'repository'), ref: safeSegment(input.ref || 'HEAD', 'ref') };
}

async function githubFetch(env: Env, url: string, init?: RequestInit): Promise<Response> {
  const parsed = new URL(url);
  if (!GITHUB_HOSTS.has(parsed.hostname)) throw new Error('GitHub capability only permits GitHub hosts');
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/vnd.github+json');
  headers.set('User-Agent', 'Uden-Repository-Capability');
  headers.set('X-GitHub-Api-Version', '2026-03-10');
  const token = (env as Env & { GITHUB_API_TOKEN?: string }).GITHUB_API_TOKEN;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) throw new Error(`GitHub request failed (${response.status})`);
  return response;
}

async function readText(response: Response): Promise<{ content: string; bytes: number }> {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_TEXT_BYTES) throw new Error('GitHub resource exceeds read limit');
  const content = await response.text();
  const bytes = new TextEncoder().encode(content).byteLength;
  if (bytes > MAX_TEXT_BYTES) throw new Error('GitHub resource exceeds read limit');
  return { content, bytes };
}

export async function fetchGitHubRawFile(env: Env, input: GitHubRepositoryRef, path: string): Promise<GitHubRepositoryResource> {
  const { owner, repo, ref } = repositoryParts(input);
  const normalizedPath = safePath(path);
  const response = await githubFetch(env, `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(ref)}/${normalizedPath}`);
  const { content, bytes } = await readText(response);
  return { kind: 'raw-file', owner, repo, ref, path: normalizedPath, content, bytes };
}

export async function fetchGitHubBlob(env: Env, input: GitHubRepositoryRef, sha: string): Promise<GitHubRepositoryResource> {
  const { owner, repo } = repositoryParts(input);
  const blobSha = safeSha(sha);
  const response = await githubFetch(env, `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs/${blobSha}`);
  const payload = await response.json() as { content?: string; encoding?: string; size?: number };
  if (payload.encoding !== 'base64' || typeof payload.content !== 'string') throw new Error('GitHub blob response was not base64 encoded');
  const binary = atob(payload.content.replace(/\s/g, ''));
  if (binary.length > MAX_TEXT_BYTES) throw new Error('GitHub blob exceeds read limit');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const content = new TextDecoder().decode(bytes);
  return { kind: 'blob', owner, repo, sha: blobSha, content, bytes: payload.size ?? bytes.byteLength };
}

export async function fetchGitHubTree(env: Env, input: GitHubRepositoryRef): Promise<GitHubRepositoryResource> {
  const { owner, repo, ref } = repositoryParts(input);
  const response = await githubFetch(env, `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(ref)}?recursive=1`);
  const payload = await response.json() as { tree?: Array<{ path: string; type: string; sha: string; size?: number }> };
  return { kind: 'tree', owner, repo, ref, entries: (payload.tree || []).map(entry => ({ path: entry.path, type: entry.type, sha: entry.sha, size: entry.size })) };
}
