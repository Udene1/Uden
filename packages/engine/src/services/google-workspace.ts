import type { Env } from '../types';

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
];
const STATE_TTL_MS = 10 * 60 * 1000;

interface StoredConnection {
  id: string;
  tenant_id: string;
  google_subject: string;
  email?: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: number;
  scopes: string;
}

export interface GmailSendResult {
  id?: string;
  threadId?: string;
  labelIds?: string[];
}

function requireConfig(env: Env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI || !env.GOOGLE_TOKEN_ENCRYPTION_KEY) {
    throw new Error('Google Workspace integration is not configured');
  }
}

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))));
}

async function verifyHmac(value: string, signature: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('HMAC', key, decodeBase64url(signature), new TextEncoder().encode(value));
}

function keyBytes(secret: string): Uint8Array {
  const bytes = decodeBase64url(secret);
  if (bytes.byteLength !== 32) throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY must decode to 32 bytes');
  return bytes;
}

async function encrypt(value: string, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', keyBytes(secret), 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value)));
  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv); combined.set(ciphertext, iv.length);
  return base64url(combined);
}

async function decrypt(value: string, secret: string): Promise<string> {
  const combined = decodeBase64url(value);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const key = await crypto.subtle.importKey('raw', keyBytes(secret), 'AES-GCM', false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

export async function createGoogleAuthorizationUrl(env: Env, tenantId: string): Promise<string> {
  requireConfig(env);
  const payload = `${tenantId}.${Date.now()}.${crypto.randomUUID()}`;
  const signature = await hmac(payload, env.GOOGLE_CLIENT_SECRET!);
  const state = `${base64url(new TextEncoder().encode(payload))}.${signature}`;
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    scope: SCOPES.join(' '),
    state,
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

export async function completeGoogleAuthorization(env: Env, code: string, state: string): Promise<{ tenantId: string; email?: string }> {
  requireConfig(env);
  const [encodedPayload, signature] = state.split('.');
  if (!encodedPayload || !signature) throw new Error('Invalid Google OAuth state');
  const payload = new TextDecoder().decode(decodeBase64url(encodedPayload));
  if (!(await verifyHmac(payload, signature, env.GOOGLE_CLIENT_SECRET!))) throw new Error('Invalid Google OAuth state');
  const [tenantId, issuedAt] = payload.split('.');
  if (!tenantId || !issuedAt || !Number.isFinite(Number(issuedAt)) || Date.now() - Number(issuedAt) > STATE_TTL_MS) throw new Error('Expired Google OAuth state');

  const tokenResponse = await fetch(GOOGLE_TOKEN, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!, redirect_uri: env.GOOGLE_REDIRECT_URI!, grant_type: 'authorization_code' }),
  });
  if (!tokenResponse.ok) throw new Error('Google OAuth token exchange failed');
  const tokens = await tokenResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string };
  if (!tokens.access_token || !tokens.refresh_token) throw new Error('Google did not return the required offline access tokens');

  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  if (!profileResponse.ok) throw new Error('Google identity lookup failed');
  const profile = await profileResponse.json() as { sub?: string; email?: string };
  if (!profile.sub) throw new Error('Google identity is missing subject');

  const now = Date.now();
  await env.DB.prepare(`
    INSERT INTO google_connections (id,tenant_id,google_subject,email,access_token_encrypted,refresh_token_encrypted,token_expires_at,scopes)
    VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(tenant_id,google_subject) DO UPDATE SET email=excluded.email,access_token_encrypted=excluded.access_token_encrypted,refresh_token_encrypted=excluded.refresh_token_encrypted,token_expires_at=excluded.token_expires_at,scopes=excluded.scopes,updated_at=CURRENT_TIMESTAMP
  `).bind(
    crypto.randomUUID(), tenantId, profile.sub, profile.email || null,
    await encrypt(tokens.access_token, env.GOOGLE_TOKEN_ENCRYPTION_KEY!),
    await encrypt(tokens.refresh_token, env.GOOGLE_TOKEN_ENCRYPTION_KEY!),
    now + Math.max(60, Number(tokens.expires_in || 3600)) * 1000,
    tokens.scope || SCOPES.join(' '),
  ).run();
  return { tenantId, email: profile.email };
}

async function getConnection(env: Env, tenantId: string): Promise<StoredConnection> {
  const row = await env.DB.prepare('SELECT * FROM google_connections WHERE tenant_id=? ORDER BY updated_at DESC LIMIT 1').bind(tenantId).first<StoredConnection>();
  if (!row) throw new Error('Google Workspace is not connected');
  return row;
}

async function getAccessToken(env: Env, tenantId: string): Promise<string> {
  requireConfig(env);
  const connection = await getConnection(env, tenantId);
  const refreshToken = await decrypt(connection.refresh_token_encrypted, env.GOOGLE_TOKEN_ENCRYPTION_KEY!);
  if (connection.token_expires_at > Date.now() + 60_000) return decrypt(connection.access_token_encrypted, env.GOOGLE_TOKEN_ENCRYPTION_KEY!);

  const response = await fetch(GOOGLE_TOKEN, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  if (!response.ok) throw new Error('Google access token refresh failed');
  const tokens = await response.json() as { access_token?: string; expires_in?: number };
  if (!tokens.access_token) throw new Error('Google token refresh returned no access token');
  await env.DB.prepare('UPDATE google_connections SET access_token_encrypted=?,token_expires_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .bind(await encrypt(tokens.access_token, env.GOOGLE_TOKEN_ENCRYPTION_KEY!), Date.now() + Math.max(60, Number(tokens.expires_in || 3600)) * 1000, connection.id).run();
  return tokens.access_token;
}

export async function listGmailMessages(env: Env, tenantId: string, query = '', maxResults = 20) {
  const accessToken = await getAccessToken(env, tenantId);
  const params = new URLSearchParams({ maxResults: String(Math.min(50, Math.max(1, maxResults))) });
  if (query) params.set('q', query.slice(0, 500));
  const list = await fetch(`${GMAIL_API}/messages?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!list.ok) throw new Error('Gmail message listing failed');
  const data = await list.json() as { messages?: Array<{ id: string; threadId: string }>; resultSizeEstimate?: number };
  const messages = await Promise.all((data.messages || []).map(async message => {
    const response = await fetch(`${GMAIL_API}/messages/${encodeURIComponent(message.id)}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) return { id: message.id, threadId: message.threadId };
    const item = await response.json() as { id: string; threadId: string; snippet?: string; payload?: { headers?: Array<{ name: string; value: string }> } };
    const headers = Object.fromEntries((item.payload?.headers || []).map(header => [header.name.toLowerCase(), header.value]));
    return { id: item.id, threadId: item.threadId, snippet: item.snippet || '', from: headers.from || '', to: headers.to || '', subject: headers.subject || '', date: headers.date || '' };
  }));
  return { messages, resultSizeEstimate: data.resultSizeEstimate || 0 };
}

function encodeMime(value: string): string {
  return base64url(new TextEncoder().encode(value));
}

export async function sendGmailMessage(env: Env, tenantId: string, to: string, subject: string, body: string): Promise<GmailSendResult> {
  if (!/^\S+@\S+\.\S+$/.test(to)) throw new Error('Invalid recipient email');
  if (!subject.trim() || subject.length > 500) throw new Error('Invalid email subject');
  if (!body.trim() || body.length > 100_000) throw new Error('Invalid email body');
  const accessToken = await getAccessToken(env, tenantId);
  const raw = [`To: ${to}`, `Subject: ${subject.replace(/[\r\n]/g, ' ')}`, 'Content-Type: text/plain; charset=UTF-8', 'MIME-Version: 1.0', '', body].join('\r\n');
  const response = await fetch(`${GMAIL_API}/messages/send`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw: encodeMime(raw) }) });
  if (!response.ok) throw new Error('Gmail send failed');
  return await response.json() as GmailSendResult;
}
