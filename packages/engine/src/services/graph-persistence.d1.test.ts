import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import type { D1Database } from '@cloudflare/workers-types';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { persistGraph, getPersistedGraph, listGraphAttempts, recordGraphAttempt, acquireGraphExecutionLease } from './graph-persistence';
import type { TaskGraph } from '@ai-work-partner/shared';

describe('graph persistence D1 integration', () => {
  let db: D1Database;
  let dispose: (() => Promise<void>) | undefined;
  beforeAll(async () => {
    const platform = await getPlatformProxy({ configPath: resolve(process.cwd(), 'wrangler.jsonc'), persist: false });
    db = platform.env.DB as D1Database; dispose = platform.dispose;
    const schema = await readFile(resolve(process.cwd(), 'src/db/schema.sql'), 'utf8');
    const durableMigration = await readFile(resolve(process.cwd(), 'migrations/0003_graph_durable_execution.sql'), 'utf8');
    const permissionsMigration = await readFile(resolve(process.cwd(), 'migrations/0005_permissions_audit.sql'), 'utf8');
    await db.exec(schema); await db.exec(durableMigration); await db.exec(permissionsMigration);
    await db.prepare(`INSERT INTO tenants (id,name,email,api_key_hash) VALUES (?,?,?,?)`).bind('tenant-a','Tenant A','a@example.test','hash-a').run();
    await db.prepare(`INSERT INTO tenants (id,name,email,api_key_hash) VALUES (?,?,?,?)`).bind('tenant-b','Tenant B','b@example.test','hash-b').run();
    await db.prepare(`INSERT INTO tasks (id,tenant_id,prompt,status) VALUES (?,?,?,?)`).bind('root-a','tenant-a','integration graph','processing').run();
  });
  afterAll(async () => { await dispose?.(); });
  const graph: TaskGraph = { id:'graph-a',rootTaskId:'root-a',goal:'integration graph',createdAt:new Date().toISOString(),nodes:[{id:'node-a',title:'First node',prompt:'Do work',domain:'general',complexity:1,expectedFormat:'markdown',recommendedTier:1,dependencies:[],contextFrom:[],status:'ready',attemptedModels:[]}] };
  it('persists graph state and enforces tenant isolation',async()=>{await persistGraph(db,'tenant-a',graph,undefined,{owner:'owner-a'});const found=await getPersistedGraph(db,'tenant-a','graph-a');expect(found?.id).toBe('graph-a');expect(found?.nodes[0].id).toBe('node-a');expect(await getPersistedGraph(db,'tenant-b','graph-a')).toBeNull();});
  it('uses the durable attempt identity for idempotent usage accounting',async()=>{const attempt={id:'attempt-a-1',graphId:'graph-a',nodeId:'node-a',tenantId:'tenant-a',attemptNumber:1,model:'gpt-4o-mini',provider:'openai',status:'completed',promptTokens:10,completionTokens:20,costCents:3,qualityScore:91,startedAt:new Date().toISOString(),completedAt:new Date().toISOString()} as const;await recordGraphAttempt(db,attempt);await recordGraphAttempt(db,{...attempt,status:'completed',qualityScore:95});const attempts=await listGraphAttempts(db,'tenant-a','graph-a','node-a');const usage=await db.prepare(`SELECT COUNT(*) AS count FROM usage_records WHERE id=? AND tenant_id=?`).bind('attempt-a-1','tenant-a').first<{count:number}>();expect(attempts).toHaveLength(1);expect(attempts[0].quality_score).toBe(95);expect(usage?.count).toBe(1);});
  it('prevents concurrent graph ownership',async()=>{const first=await acquireGraphExecutionLease(db,'tenant-a','graph-a','owner-one',120);const second=await acquireGraphExecutionLease(db,'tenant-a','graph-a','owner-two',120);expect(first).toBe(true);expect(second).toBe(false);});
});
