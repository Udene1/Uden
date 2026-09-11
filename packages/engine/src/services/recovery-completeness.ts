import type { D1Database } from '@cloudflare/workers-types';

export type RecoveryResourceKind='provider_attempt'|'runtime_execution'|'repository_operation'|'budget_reservation';
export type RecoveryPath='reconcile_provider'|'reconcile_runtime'|'reconcile_repository'|'reclaim_budget';
export interface RecoveryResource { kind:RecoveryResourceKind; id:string; graphId:string|null; state:string; paths:RecoveryPath[]; }

function assertExactlyOne(resource:RecoveryResource):RecoveryResource{if(resource.paths.length!==1)throw new Error(`Recovery completeness violation for ${resource.kind}:${resource.id}: expected exactly one recovery path, found ${resource.paths.length}`);return resource;}

export async function auditRecoveryCompleteness(db:D1Database,tenantId:string):Promise<RecoveryResource[]>{
  const resources:RecoveryResource[]=[];
  const provider=await db.prepare(`SELECT id,graph_id,external_outcome FROM task_graph_attempts WHERE tenant_id=? AND external_outcome IN ('in_flight','possibly_succeeded','unknown')`).bind(tenantId).all<{id:string;graph_id:string;external_outcome:string}>();
  for(const row of provider.results||[])resources.push(assertExactlyOne({kind:'provider_attempt',id:row.id,graphId:row.graph_id,state:row.external_outcome,paths:['reconcile_provider']}));
  const runtime=await db.prepare(`SELECT attempt_id,graph_id,status FROM runtime_executions WHERE tenant_id=? AND status IN ('in_flight','possibly_succeeded','unknown')`).bind(tenantId).all<{attempt_id:string;graph_id:string;status:string}>();
  for(const row of runtime.results||[])resources.push(assertExactlyOne({kind:'runtime_execution',id:row.attempt_id,graphId:row.graph_id,state:row.status,paths:['reconcile_runtime']}));
  const repository=await db.prepare(`SELECT id,graph_id,status FROM repository_operations WHERE tenant_id=? AND status IN ('in_flight','unknown')`).bind(tenantId).all<{id:string;graph_id:string;status:string}>();
  for(const row of repository.results||[])resources.push(assertExactlyOne({kind:'repository_operation',id:row.id,graphId:row.graph_id,state:row.status,paths:['reconcile_repository']}));
  const budget=await db.prepare(`SELECT id,reference_id,graph_id,status FROM budget_reservations WHERE tenant_id=? AND status='reserved' AND graph_id IS NOT NULL AND execution_version < COALESCE((SELECT execution_version FROM task_graphs WHERE id=budget_reservations.graph_id AND tenant_id=?),execution_version)`).bind(tenantId,tenantId).all<{id:string;reference_id:string;graph_id:string;status:string}>();
  for(const row of budget.results||[])resources.push(assertExactlyOne({kind:'budget_reservation',id:row.id,graphId:row.graph_id,state:row.status,paths:['reclaim_budget']}));
  return resources;
}
