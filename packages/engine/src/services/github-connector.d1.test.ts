import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import type { D1Database } from '@cloudflare/workers-types';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createGitHubAuthorizationUrl } from './github-connector';

const testDir = dirname(fileURLToPath(import.meta.url));
const engineRoot = resolve(testDir, '../..');
const schemaPath = resolve(testDir, '../db/schema.sql');
const migration = resolve(engineRoot, 'migrations/0008_github_connector.sql');
const execSqlFile = async (db: D1Database, path: string) => { const sql = await readFile(path, 'utf8'); for (const statement of sql.replace(/^\uFEFF/, '').replace(/^[\t ]*--[^\r\n]*(?:\r?\n|$)/gm, '').split(';').map(s => s.trim()).filter(Boolean)) await db.prepare(statement).run(); };

describe('GitHub connector D1 integration', () => {
  let db: D1Database; let dispose: (() => Promise<void>) | undefined;
  beforeAll(async () => { const platform = await getPlatformProxy({ configPath: resolve(engineRoot, 'wrangler.test.jsonc'), persist: false }); db = platform.env.DB as D1Database; dispose = platform.dispose; await execSqlFile(db, schemaPath); await execSqlFile(db, migration); await db.prepare('INSERT INTO tenants (id,name,email,api_key_hash) VALUES (?,?,?,?)').bind('github-a','GitHub A','a@example.test','github-hash-a').run(); });
  afterAll(async () => { await dispose?.(); });
  it('persists a tenant-bound one-time OAuth state', async () => { const env = { DB: db, GITHUB_CLIENT_ID: 'client', GITHUB_CLIENT_SECRET: 'secret', GITHUB_REDIRECT_URI: 'https://example.test/callback', GITHUB_TOKEN_ENCRYPTION_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' } as never; const url = await createGitHubAuthorizationUrl(env, 'github-a'); expect(url).toContain('github.com/login/oauth/authorize'); const rows = await db.prepare('SELECT state_hash,tenant_id,expires_at,used_at FROM github_oauth_states WHERE tenant_id=?').bind('github-a').all(); expect(rows.results).toHaveLength(1); expect((rows.results[0] as any).state_hash).toBeTruthy(); expect((rows.results[0] as any).expires_at).toBeGreaterThan(Date.now()); expect((rows.results[0] as any).used_at).toBeNull(); });
});
