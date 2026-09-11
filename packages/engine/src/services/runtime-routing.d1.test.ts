import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';
import { getPlatformProxy } from 'wrangler';
import type { D1Database } from '@cloudflare/workers-types';
import { applyCurrentD1Schema } from '../test/d1-bootstrap';
import { registerExecutionRuntime } from './execution-runtimes';
import { selectExecutionRuntime } from './runtime-routing';

describe.sequential('capability-aware runtime selection D1 integration', () => {
  let db: D1Database;
  let dispose: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const platform = await getPlatformProxy({ configPath: resolve(process.cwd(), 'wrangler.test.jsonc'), persist: false });
    db = platform.env.DB as D1Database;
    dispose = platform.dispose;
    await applyCurrentD1Schema(db, resolve(process.cwd()));
    await db.prepare(`INSERT INTO tenants (id,name,email,api_key_hash,monthly_budget_cents) VALUES (?,?,?,?,?)`).bind('routing-tenant','Routing tests','routing@example.test','routing-hash',100).run();
  });

  afterAll(async () => { await dispose?.(); });

  it('selects a live runtime that actually advertises the requested capability', async () => {
    await registerExecutionRuntime(db, 'routing-tenant', { id: 'desktop-git', tenantId: 'routing-tenant', kind: 'desktop_local', state: 'online', capabilities: ['git.read'], lastHeartbeatAt: new Date().toISOString() });
    await registerExecutionRuntime(db, 'routing-tenant', { id: 'desktop-command', tenantId: 'routing-tenant', kind: 'desktop_local', state: 'online', capabilities: ['command.exec'], lastHeartbeatAt: new Date().toISOString() });

    expect((await selectExecutionRuntime(db, 'routing-tenant', 'git.read'))?.id).toBe('desktop-git');
    expect(await selectExecutionRuntime(db, 'routing-tenant', 'git.write')).toBeNull();
  });

  it('honours a preferred runtime kind without bypassing capability filtering', async () => {
    await registerExecutionRuntime(db, 'routing-tenant', { id: 'cloud-git', tenantId: 'routing-tenant', kind: 'cloud_sandbox', state: 'online', capabilities: ['git.read'], lastHeartbeatAt: new Date().toISOString() });
    expect((await selectExecutionRuntime(db, 'routing-tenant', 'git.read', 'cloud_sandbox'))?.id).toBe('cloud-git');
    expect(await selectExecutionRuntime(db, 'routing-tenant', 'git.write', 'desktop_local')).toBeNull();
  });
});
