import type { Env } from '../types';

const AUTH_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const API_URL = 'https://api.github.com';
const STATE_TTL_MS = 10 * 60 * 1000;
const MAX_READ = 100_000;

export interface GitHubRepository { id: number; full_name: string; name: string; default_branch: string; private: boolean; html_url: string; }
export interface GitHubFile { path: string; sha: string; size: number; type: string; content?: string; encoding?: string; html_url?: string; }
export interface GitHubBlob { sha: string; size: number; url: string; content?: string; encoding?: string; }
export interface GitHubRef { ref: string; node_id: string; object: { sha: string; type: string; url: string }; }

function requireConfig(env: Env): void {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.GITHUB_REDIRECT_URI || !env.GITHUB_TOKEN_ENCRYPTION_KEY) throw new Error('GitHub integration is not configured');
}
function b64(bytes: Uint8Array): string { let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); }
function unb64(value: string): Uint8Array { const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4); return Uint8Array.from(atob(padded), c => c.charCodeAt(0)); }
async function sha256(value: string): Promise<string> { return b64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))); }
async function hmac(value: string, secret: string): Promise<string> { const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return b64(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)))); }
async function verify(value: string, signature: string, secret: string): Promise<boolean> { const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']); return crypto.subtle.verify('HMAC', key, unb64(signature), new TextEncoder().encode(value)); }
function keyBytes(secret: string): Uint8Array { const bytes = unb64(secret); if (bytes.byteLength !== 32) throw new Error('GITHUB_TOKEN_ENCRYPTION_KEY must decode to 32 bytes'); return bytes; }
async function encrypt(value: string, secret: string): Promise<string> { const iv = crypto.getRandomValues(new Uint8Array(12)); const key = await crypto.subtle.importKey('raw', keyBytes(secret), 'AES-GCM', false, ['encrypt']); const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value))); const combined = new Uint8Array(12 + ciphertext.length); combined.set(iv); combined.set(ciphertext, 12); return b64(combined); }
async function decrypt(value: string, secret: string): Promise<string> { const combined = unb64(value); if (combined.length < 13) throw new Error('Invalid encrypted GitHub token'); const key = await crypto.subtle.importKey('raw', keyBytes(secret), 'AES-GCM', false, ['decrypt']); return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: combined.slice(0, 12) }, key, combined.slice(12))); }

export async function createGitHubAuthorizationUrl(env: Env, tenantId: string): Promise<string> {
  requireConfig(env);
  const payload = `${tenantId}.${Date.now()}.${crypto.randomUUID()}`;
  const state = `${b64(new TextEncoder().encode(payload))}.${await hmac(payload, env.GITHUB_CLIENT_SECRET!)}`;
  await env.DB.prepare('INSERT INTO github_oauth_states (state_hash,tenant_id,expires_at) VALUES (?,?,?)').bind(await sha256(state), tenantId, Date.now() + STATE_TTL_MS).run();
  const params = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID!, redirect_uri: env.GITHUB_REDIRECT_URI!, scope: 'repo read:user user:email', state });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function completeGitHubAuthorization(env: Env, code: string, state: string): Promise<{ tenantId: string; login: string }> {
  requireConfig(env);
  const [encoded, signature] = state.split('.'); if (!encoded || !signature) throw new Error('Invalid GitHub OAuth state');
  const payload = new TextDecoder().decode(unb64(encoded)); if (!(await verify(payload, signature, env.GITHUB_CLIENT_SECRET!))) throw new Error('Invalid GitHub OAuth state');
  const [tenantId, issuedAt] = payload.split('.'); const issued = Number(issuedAt);
  if (!tenantId || !Number.isFinite(issued) || Date.now() - issued > STATE_TTL_MS || Date.now() < issued - 30_000) throw new Error('Expired GitHub OAuth state');
  const consumed = await env.DB.prepare('UPDATE github_oauth_states SET used_at=CURRENT_TIMESTAMP WHERE state_hash=? AND tenant_id=? AND used_at IS NULL AND expires_at>?').bind(await sha256(state), tenantId, Date.now()).run();
  if ((consumed.meta?.changes || 0) !== 1) throw new Error('Invalid or already-used GitHub OAuth state');
  const tokenResponse = await fetch(TOKEN_URL, { method: 'POST', headers: { Accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID!, client_secret: env.GITHUB_CLIENT_SECRET!, code, redirect_uri: env.GITHUB_REDIRECT_URI! }) });
  if (!tokenResponse.ok) throw new Error('GitHub OAuth token exchange failed');
  const token = await tokenResponse.json() as { access_token?: string; scope?: string; error?: string }; if (!token.access_token) throw new Error('GitHub did not return an access token');
  const profile = await githubRequest<{ id: number; login: string }>(env, token.access_token, '/user');
  await env.DB.prepare(`INSERT INTO github_connections (id,tenant_id,github_user_id,login,access_token_encrypted,scopes) VALUES (?,?,?,?,?,?) ON CONFLICT(tenant_id,github_user_id) DO UPDATE SET login=excluded.login,access_token_encrypted=excluded.access_token_encrypted,scopes=excluded.scopes,updated_at=CURRENT_TIMESTAMP`).bind(crypto.randomUUID(), tenantId, String(profile.id), profile.login, await encrypt(token.access_token, env.GITHUB_TOKEN_ENCRYPTION_KEY!), token.scope || 'repo read:user user:email').run();
  return { tenantId, login: profile.login };
}

async function getToken(env: Env, tenantId: string): Promise<string> { requireConfig(env); const row = await env.DB.prepare('SELECT access_token_encrypted FROM github_connections WHERE tenant_id=? ORDER BY updated_at DESC LIMIT 1').bind(tenantId).first<{ access_token_encrypted: string }>(); if (!row) throw new Error('GitHub is not connected'); return decrypt(row.access_token_encrypted, env.GITHUB_TOKEN_ENCRYPTION_KEY!); }
async function githubRequest<T>(env: Env, token: string, path: string, init: RequestInit = {}): Promise<T> { const headers = new Headers(init.headers); headers.set('Accept', 'application/vnd.github+json'); headers.set('X-GitHub-Api-Version', '2022-11-28'); headers.set('User-Agent', 'Uden/1.0'); headers.set('Authorization', `Bearer ${token}`); const response = await fetch(`${API_URL}${path}`, { ...init, headers }); if (!response.ok) { if (response.status === 401) throw new Error('GitHub authorization expired'); if (response.status === 403) throw new Error('GitHub API permission or rate limit exceeded'); if (response.status === 404) throw new Error('GitHub resource not found'); throw new Error(`GitHub API request failed (${response.status})`); } return response.json() as Promise<T>; }
function repoPath(owner: string, repo: string, suffix = '') { if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) throw new Error('Invalid GitHub repository'); return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${suffix}`; }
function objectSha(value: string, label: string): string { const sha = value.trim(); if (!/^[a-f0-9]{7,64}$/i.test(sha)) throw new Error(`Invalid GitHub ${label} SHA`); return sha; }

export async function disconnectGitHub(env: Env, tenantId: string): Promise<void> { await env.DB.prepare('DELETE FROM github_connections WHERE tenant_id=?').bind(tenantId).run(); }
export async function listGitHubRepositories(env: Env, tenantId: string): Promise<GitHubRepository[]> { const token = await getToken(env, tenantId); return githubRequest<GitHubRepository[]>(env, token, '/user/repos?sort=updated&per_page=100'); }
export async function getGitHubTree(env: Env, tenantId: string, owner: string, repo: string, ref?: string): Promise<unknown> { const token = await getToken(env, tenantId); const query = ref ? `?recursive=1&ref=${encodeURIComponent(ref)}` : '?recursive=1'; return githubRequest(env, token, `${repoPath(owner, repo, '/git/trees')}${query}`); }
export async function getGitHubTreeBySha(env: Env, tenantId: string, owner: string, repo: string, sha: string): Promise<unknown> { const token = await getToken(env, tenantId); return githubRequest(env, token, `${repoPath(owner, repo, `/git/trees/${objectSha(sha, 'tree')}`)}`); }
export async function getGitHubFile(env: Env, tenantId: string, owner: string, repo: string, path: string, ref?: string): Promise<GitHubFile> { const token = await getToken(env, tenantId); const safePath = path.split('/').map(segment => { if (!segment || segment === '.' || segment === '..') throw new Error('Invalid GitHub file path'); return encodeURIComponent(segment); }).join('/'); const query = ref ? `?ref=${encodeURIComponent(ref)}` : ''; const file = await githubRequest<GitHubFile & { content?: string }>(env, token, repoPath(owner, repo, `/contents/${safePath}${query}`)); if (file.content && file.encoding === 'base64') file.content = new TextDecoder().decode(unb64(file.content.replace(/\n/g, ''))).slice(0, MAX_READ); return file; }
export async function getGitHubBlob(env: Env, tenantId: string, owner: string, repo: string, sha: string): Promise<GitHubBlob> { const token = await getToken(env, tenantId); const blob = await githubRequest<GitHubBlob>(env, token, repoPath(owner, repo, `/git/blobs/${objectSha(sha, 'blob')}`)); if (blob.content && blob.encoding === 'base64') blob.content = new TextDecoder().decode(unb64(blob.content.replace(/\n/g, ''))).slice(0, MAX_READ); return blob; }
export async function getGitHubCommit(env: Env, tenantId: string, owner: string, repo: string, sha: string): Promise<unknown> { const token = await getToken(env, tenantId); return githubRequest(env, token, repoPath(owner, repo, `/commits/${objectSha(sha, 'commit')}`)); }
export async function getGitHubGitCommit(env: Env, tenantId: string, owner: string, repo: string, sha: string): Promise<unknown> { const token = await getToken(env, tenantId); return githubRequest(env, token, repoPath(owner, repo, `/git/commits/${objectSha(sha, 'commit')}`)); }
export async function getGitHubRef(env: Env, tenantId: string, owner: string, repo: string, ref: string): Promise<GitHubRef> { const token = await getToken(env, tenantId); const normalized = ref.replace(/^refs\//, ''); if (!/^[A-Za-z0-9_.\/-]+$/.test(normalized) || normalized.includes('..')) throw new Error('Invalid GitHub ref'); return githubRequest<GitHubRef>(env, token, repoPath(owner, repo, `/git/ref/${encodeURIComponent(normalized).replace(/%2F/g, '/')}`)); }
export async function listGitHubCommits(env: Env, tenantId: string, owner: string, repo: string, ref?: string): Promise<unknown> { const token = await getToken(env, tenantId); const query = ref ? `?sha=${encodeURIComponent(ref)}&per_page=50` : '?per_page=50'; return githubRequest(env, token, `${repoPath(owner, repo, '/commits')}${query}`); }
export async function searchGitHubCode(env: Env, tenantId: string, query: string, owner?: string, repo?: string): Promise<unknown> { const token = await getToken(env, tenantId); const q = query.trim().slice(0, 300); if (!q) throw new Error('GitHub code search query is required'); const qualifiers = owner && repo ? ` repo:${owner}/${repo}` : ''; return githubRequest(env, token, `/search/code?q=${encodeURIComponent(q + qualifiers)}&per_page=50`); }
export async function listGitHubPulls(env: Env, tenantId: string, owner: string, repo: string, state = 'open'): Promise<unknown> { const token = await getToken(env, tenantId); return githubRequest(env, token, `${repoPath(owner, repo, '/pulls')}?state=${state === 'all' ? 'all' : state === 'closed' ? 'closed' : 'open'}&per_page=50`); }
export async function getGitHubPull(env: Env, tenantId: string, owner: string, repo: string, number: number): Promise<unknown> { const token = await getToken(env, tenantId); if (!Number.isInteger(number) || number < 1) throw new Error('Invalid pull request number'); return githubRequest(env, token, repoPath(owner, repo, `/pulls/${number}`)); }
export async function getGitHubPullDiff(env: Env, tenantId: string, owner: string, repo: string, number: number): Promise<string> { const token = await getToken(env, tenantId); if (!Number.isInteger(number) || number < 1) throw new Error('Invalid pull request number'); const response = await fetch(`${API_URL}${repoPath(owner, repo, `/pulls/${number}`)}`, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Uden/1.0', Accept: 'application/vnd.github.diff', 'X-GitHub-Api-Version': '2022-11-28' } }); if (!response.ok) throw new Error(`GitHub pull request diff failed (${response.status})`); return (await response.text()).slice(0, MAX_READ); }
export async function listGitHubActionsRuns(env: Env, tenantId: string, owner: string, repo: string, branch?: string): Promise<unknown> { const token = await getToken(env, tenantId); const query = branch ? `?branch=${encodeURIComponent(branch)}&per_page=50` : '?per_page=50'; return githubRequest(env, token, `${repoPath(owner, repo, '/actions/runs')}${query}`); }
