import { getTenantByApiKey } from '../db/queries';

export type AuthClient = 'desktop' | 'web' | 'mobile' | 'api';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createAuthSession(
  db: D1Database,
  tenantId: string,
  client: AuthClient,
  subject = `tenant:${tenantId}`,
) {
  const token = `us_${crypto.randomUUID().replace(/-/g, '')}`;
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const tokenHash = await sha256(token);

  await db.prepare(
    `INSERT INTO auth_sessions (id, tenant_id, subject, token_hash, client, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(id, tenantId, subject, tokenHash, client, expiresAt).run();

  return { id, token, subject, client, expiresAt };
}

export async function getAuthSession(db: D1Database, token: string) {
  const tokenHash = await sha256(token);
  return db.prepare(
    `SELECT id, tenant_id, subject, client, created_at, expires_at, revoked_at
     FROM auth_sessions
     WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?`,
  ).bind(tokenHash, new Date().toISOString()).first<{
    id: string;
    tenant_id: string;
    subject: string;
    client: AuthClient;
    created_at: string;
    expires_at: string;
    revoked_at: string | null;
  }>();
}

export async function revokeAuthSession(db: D1Database, token: string) {
  const tokenHash = await sha256(token);
  await db.prepare(
    `UPDATE auth_sessions SET revoked_at = ?
     WHERE token_hash = ? AND revoked_at IS NULL`,
  ).bind(new Date().toISOString(), tokenHash).run();
}

export async function authenticateApiKey(db: D1Database, rawKey: string) {
  const tokenHash = await sha256(rawKey);
  return getTenantByApiKey(db, tokenHash);
}
