import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import type { D1Database } from '@cloudflare/workers-types';
import { readFile } from 'node:fs/promises';
import { dirname, fileURLToPath, resolve } from 'node:path';
import { authorizeRepositoryOperation, markRepositoryOperationInFlight, markRepositoryOperationUnknown, completeRepositoryOperation, listUnknownRepositoryOperations } from './repository-operations';

const testDir = dirname(fileURLToPath(import.meta.url));
const engineRoot = resolve(testDir, '../..');
const schemaPath = resolve(testDir, '../db/schema.sql');
const migrations = [
  '0002_task_graph_persistence.sql','0003_graph_durable_execution.sql','0004_budget_reservations.sql','0005_permissions_audit.sql',
  '0006_google_workspace.sql','0007_workspace_runtime.sql','0008_github_connector.sql','0009_project_patches.sql','0010_graph_node_approvals.sql',
  '0011_runtime_job_linkage.sql','0012_autonomous_objectives.sql','0012_graph_node_tool_persistence.sql','0013_graph_verification_repair.sql',
  '0014_graph_repair_proposals.sql','0015_autonomous_workflow_linkage.sql','0015_execution_side_effect_fencing.sql','0016_autonomous_objective_projects.sql',
  '0016_execution_principal.sql','0017_durable_graph_approvals.sql','0018_durable_attempt_outcomes.sql','0019_attempt_cost_estimates.sql',
  '0020_origin_connector.sql','0021_repository_operations.sql',
];

async function execSqlFile(db: D1Database, path: string): Promise<void> {
  const sql = await readFile(path, 'utf8');
  for (const statement of sql.replace(/^\uFEFF/, '').replace(/^[\t ]*--[^\r\n]*(?:\r?\n|$)/gm, '').split(';').map(s => s.trim()).filter(Boolean)) await db.prepare(statement).run();
}

describe.sequential('repository operation durability', () => {
  let db: D1Database;
  let dispose: (() => Promise<void>) | undefined;
  const graph = { tenantId: 'repo-tenant', graphId: 'repo-graph', nodeId: 'repo-node', executionOwner: 'worker-a', executionVersion: 4 };

  beforeAll(async () => {
    const platform = await getPlatformProxy({ configPath: resolve(engineRoot, 'wrangler.test.jsonc'), persist: false });
    db = platform.env.DB as D1Database;
    dispose = platform.dispose;
    await execSqlFile(db, schemaPath);
    for (const migration of migrations) await execSqlFile(db, resolve(engineRoot, 'migrations', migration));
    await db.prepare('INSERT INTO tenants(id,name,email,api_key_hash) VALUES(?,?,?,?)').bind(graph.tenantId, 'Repository Ops', 'repo@example.test', 'repo-hash').run();
    await db.prepare('INSERT INTO tasks(id,tenant_id,prompt,status) VALUES(?,?,?,?)').bind('repo-root', graph.tenantId, 'repository operation', 'processing').run();
    await db.prepare(`INSERT INTO task_graphs(id,tenant_id,root_task_id,goal,status,execution_version,execution_owner,lease_until) VALUES(?,?,?,?,?,?,?,datetime('now','+120 seconds'))`).bind(graph.graphId, graph.tenantId, 'repo-root', 'repository operation', 'running', graph.executionVersion, graph.executionOwner).run();
  });
  afterAll(async () => { await dispose?.(); });

  it('authorizes once and preserves the durable identity across retries', async () => {
    const input = { id: 'repo-op-1', ...graph, repository: { provider: 'github' as const, owner: 'Udene1', repo: 'Uden' }, operation: 'commit_files' as const, expectedHeadSha: 'abcdef1234567', idempotencyKey: 'repo-op-key-1' };
    const first = await authorizeRepositoryOperation(db, input);
    const second = await authorizeRepositoryOperation(db, { ...input, id: 'different-id' });
    expect(first.id).toBe('repo-op-1');
    expect(second.id).toBe(first.id);
    expect(second.idempotencyKey).toBe('repo-op-key-1');
  });

  it('marks ambiguous remote outcomes unknown and refuses blind replay', async () => {
    const input = { id: 'repo-op-2', ...graph, repository: { provider: 'origin' as const, owner: 'team', repo: 'service' }, operation: 'merge_pull_request' as const, expectedHeadSha: '1234567890ab', idempotencyKey: 'repo-op-key-2' };
    const authorized = await authorizeRepositoryOperation(db, input);
    await markRepositoryOperationInFlight(db, input);
    const unknown = await markRepositoryOperationUnknown(db, input, 'network timeout after remote acceptance');
    expect(unknown.status).toBe('unknown');
    expect(unknown.externalOutcome).toBe('unknown');
    const replay = await authorizeRepositoryOperation(db, { ...input, id: 'repo-op-2-replay' });
    expect(replay.status).toBe('unknown');
    expect((await listUnknownRepositoryOperations(db, graph.tenantId)).map(op => op.id)).toContain(authorized.id);
  });

  it('requires the live graph fence before a side effect can enter flight', async () => {
    const input = { id: 'repo-op-3', ...graph, repository: { provider: 'github' as const, owner: 'Udene1', repo: 'Uden' }, operation: 'create_branch' as const, idempotencyKey: 'repo-op-key-3' };
    await authorizeRepositoryOperation(db, input);
    await db.prepare("UPDATE task_graphs SET execution_owner=?, execution_version=? WHERE id=? AND tenant_id=?").bind('worker-b', 5, graph.graphId, graph.tenantId).run();
    await expect(markRepositoryOperationInFlight(db, input)).rejects.toThrow('Graph execution lease lost');
  });

  it('records completion only from the owning fence', async () => {
    const input = { id: 'repo-op-4', ...graph, repository: { provider: 'github' as const, owner: 'Udene1', repo: 'Uden' }, operation: 'create_pull_request' as const, idempotencyKey: 'repo-op-key-4' };
    // Restore the original fence for this independent operation.
    await db.prepare("UPDATE task_graphs SET execution_owner=?, execution_version=?, lease_until=datetime('now','+120 seconds') WHERE id=? AND tenant_id=?").bind(graph.executionOwner, graph.executionVersion, graph.graphId, graph.tenantId).run();
    await authorizeRepositoryOperation(db, input);
    await markRepositoryOperationInFlight(db, input);
    const completed = await completeRepositoryOperation(db, input, { pullRequestNumber: 42, resultSha: 'fedcba1234567' });
    expect(completed.status).toBe('completed');
    expect(completed.pullRequestNumber).toBe(42);
    expect(completed.resultSha).toBe('fedcba1234567');
  });
});
