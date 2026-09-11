import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { D1Database } from '@cloudflare/workers-types';

const migrations = [
  '0002_task_graph_persistence.sql','0003_graph_durable_execution.sql','0004_budget_reservations.sql','0005_permissions_audit.sql',
  '0006_google_workspace.sql','0007_workspace_runtime.sql','0008_github_connector.sql','0009_project_patches.sql','0010_graph_node_approvals.sql',
  '0011_runtime_job_linkage.sql','0012_autonomous_objectives.sql','0012_graph_node_tool_persistence.sql','0013_graph_verification_repair.sql',
  '0014_graph_repair_proposals.sql','0015_autonomous_workflow_linkage.sql','0015_execution_side_effect_fencing.sql','0016_autonomous_objective_projects.sql',
  '0016_execution_principal.sql','0017_durable_graph_approvals.sql','0018_durable_attempt_outcomes.sql','0019_attempt_cost_estimates.sql',
  '0020_origin_connector.sql','0021_repository_operations.sql',
] as const;

async function execSqlFile(db: D1Database, path: string): Promise<void> {
  const sql = await readFile(path, 'utf8');
  for (const statement of sql.replace(/^\uFEFF/, '').replace(/^[\t ]*--[^\r\n]*(?:\r?\n|$)/gm, '').split(';').map(s => s.trim()).filter(Boolean)) {
    await db.prepare(statement).run();
  }
}

/**
 * Creates the same schema a fresh deployment receives: baseline schema followed by every
 * committed migration. This deliberately fails on a broken migration; tests must never hide
 * schema drift by swallowing migration errors or substituting mock tables.
 */
export async function applyCurrentD1Schema(db: D1Database, engineRoot: string): Promise<void> {
  await execSqlFile(db, resolve(engineRoot, 'src/db/schema.sql'));
  for (const migration of migrations) await execSqlFile(db, resolve(engineRoot, 'migrations', migration));
}
