import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import type { D1Database } from '@cloudflare/workers-types';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { getGraphRepairProposal, listGraphRepairProposals, rejectGraphRepair } from './graph-repair-proposals';
import { persistGraph } from './graph-persistence';
import type { TaskGraph } from '@ai-work-partner/shared';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const execSqlFile = async (db: D1Database, path: string) => { const sql = await readFile(path, 'utf8'); for (const statement of sql.replace(/^\uFEFF/, '').replace(/^[\t ]*--[^\r\n]*(?:\r?\n|$)/gm, '').split(';').map(s => s.trim()).filter(Boolean)) await db.prepare(statement).run(); };

describe('graph repair proposals D1 integration', () => {
  let db: D1Database; let dispose: (() => Promise<void>) | undefined;
  beforeAll(async () => { const platform = await getPlatformProxy({ configPath: resolve(root, 'wrangler.jsonc'), persist: false }); db = platform.env.DB as D1Database; dispose = platform.dispose; await execSqlFile(db, resolve(here, '../db/schema.sql')); for (const migration of ['0002_task_graph_persistence.sql','0003_graph_durable_execution.sql','0010_graph_node_approvals.sql','0011_runtime_job_linkage.sql','0012_graph_node_tool_persistence.sql','0013_graph_verification_repair.sql','0014_graph_repair_proposals.sql']) await execSqlFile(db, resolve(root, `migrations/${migration}`)); await db.prepare('INSERT INTO tenants (id,name,email,api_key_hash) VALUES (?,?,?,?)').bind('repair-tenant','Repair Tenant','repair@example.test','repair-hash').run(); });
  afterAll(async () => { await dispose?.(); });

  it('persists and isolates a repair proposal', async () => {
    const graph: TaskGraph = { id: 'repair-graph', rootTaskId: 'repair-task', goal: 'repair project', projectId: 'repair-project', createdAt: new Date().toISOString(), nodes: [{ id: 'execute', title: 'Run tests', prompt: 'npm test', domain: 'code', complexity: 1, expectedFormat: 'text', recommendedTier: 1, dependencies: [], contextFrom: [], status: 'awaiting-approval', attemptedModels: [], kind: 'project-tool', tool: 'execute', approvalRequired: true, approvalState: 'pending', repairAttempts: 1 }] };
    await db.prepare('INSERT INTO tasks (id,tenant_id,prompt,status,mode,escalation_count,created_at) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)').bind('repair-task','repair-tenant','repair project','processing','permissionless',0).run();
    await db.prepare('INSERT INTO projects (id,tenant_id,name,created_at,updated_at) VALUES (?,?,?,?,?)').bind('repair-project','repair-tenant','Repair Project',new Date().toISOString(),new Date().toISOString()).run();
    await persistGraph(db, 'repair-tenant', graph);
    await db.prepare(`INSERT INTO graph_repair_proposals (id,tenant_id,graph_id,node_id,attempt_number,status,instruction,patch_json,reason) VALUES (?,?,?,?,?,'proposed',?,?,?)`).bind('proposal-1','repair-tenant','repair-graph','execute',1,'repair tests','[{"path":"src/test.ts","content":"fixed"}]','verification failed').run();
    const proposal = await getGraphRepairProposal(db, 'repair-tenant', 'proposal-1');
    expect(proposal?.status).toBe('proposed'); expect(proposal?.patch[0].path).toBe('src/test.ts'); expect(proposal?.attemptNumber).toBe(1);
    const listed = await listGraphRepairProposals(db, 'repair-tenant', 'repair-graph', 'execute'); expect(listed).toHaveLength(1);
    const rejected = await rejectGraphRepair(db, 'repair-tenant', 'proposal-1', 'admin', 'unsafe'); expect(rejected.status).toBe('rejected'); expect(rejected.error).toBe('unsafe');
    await expect(rejectGraphRepair(db, 'repair-tenant', 'proposal-1', 'admin')).rejects.toThrow('not awaiting approval');
  });

  it('enforces tenant isolation for repair proposals', async () => {
    expect(await getGraphRepairProposal(db, 'other-tenant', 'proposal-1')).toBeNull();
    expect(await listGraphRepairProposals(db, 'other-tenant', 'repair-graph')).toEqual([]);
  });
});
