import type { D1Database } from '@cloudflare/workers-types';
import type { ExecutionRuntimeCapability, ExecutionRuntimeDescriptor, ExecutionRuntimeKind, ExecutionRuntimeState, RuntimeExecutionRequest, RuntimeExecutionResult } from '@ai-work-partner/shared';

const RUNTIME_HEARTBEAT_TIMEOUT_SECONDS = 90;

type RuntimeRow = { id:string; tenant_id:string; kind:ExecutionRuntimeKind; state:ExecutionRuntimeState; capabilities_json:string; last_heartbeat_at:string; metadata_json:string|null; created_at:string; updated_at:string };
type ExecutionRow = { id:string; tenant_id:string; runtime_id:string; graph_id:string; node_id:string; attempt_id:string; execution_version:number; capability:ExecutionRuntimeCapability; status:'authorized'|'in_flight'|'completed'|'failed'|'timed_out'|'unknown'; external_operation_id:string|null; working_directory:string|null; command:string|null; args_json:string|null; stdout:string|null; stderr:string|null; exit_code:number|null; error:string|null; started_at:string|null; finished_at:string|null; created_at:string; updated_at:string };

const parseArray=(value:string|null):ExecutionRuntimeCapability[]=>{try{const parsed=JSON.parse(value||'[]');return Array.isArray(parsed)?parsed:[];}catch{return[];}};
const parseMetadata=(value:string|null):Record<string,string>|undefined=>{try{const parsed=JSON.parse(value||'null');return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:undefined;}catch{return undefined;}};
const mapRuntime=(row:RuntimeRow):ExecutionRuntimeDescriptor=>({id:row.id,tenantId:row.tenant_id,kind:row.kind,state:row.state,capabilities:parseArray(row.capabilities_json),lastHeartbeatAt:row.last_heartbeat_at,metadata:parseMetadata(row.metadata_json)});
const mapExecution=(row:ExecutionRow):RuntimeExecutionResult=>({runtimeId:row.runtime_id,graphId:row.graph_id,nodeId:row.node_id,attemptId:row.attempt_id,outcome:row.status==='timed_out'?'timed_out':row.status==='unknown'?'unknown':row.status==='completed'?'completed':'failed',exitCode:row.exit_code??undefined,stdout:row.stdout??undefined,stderr:row.stderr??undefined,startedAt:row.started_at||row.created_at,finishedAt:row.finished_at||row.updated_at,externalOperationId:row.external_operation_id??undefined,error:row.error??undefined});

export async function registerExecutionRuntime(db:D1Database,tenantId:string,runtime:ExecutionRuntimeDescriptor):Promise<ExecutionRuntimeDescriptor>{
  if(runtime.tenantId!==tenantId)throw new Error('Runtime tenant mismatch');
  const row=await db.prepare(`INSERT INTO execution_runtimes (id,tenant_id,kind,state,capabilities_json,last_heartbeat_at,metadata_json) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET tenant_id=excluded.tenant_id,kind=excluded.kind,state=excluded.state,capabilities_json=excluded.capabilities_json,last_heartbeat_at=excluded.last_heartbeat_at,metadata_json=excluded.metadata_json,updated_at=CURRENT_TIMESTAMP WHERE execution_runtimes.tenant_id=excluded.tenant_id RETURNING *`).bind(runtime.id,tenantId,runtime.kind,runtime.state,JSON.stringify(runtime.capabilities),runtime.lastHeartbeatAt,runtime.metadata?JSON.stringify(runtime.metadata):null).first<RuntimeRow>();
  if(!row)throw new Error('Runtime registration rejected');return mapRuntime(row);
}

export async function heartbeatExecutionRuntime(db:D1Database,tenantId:string,runtimeId:string,state:ExecutionRuntimeState='online'):Promise<ExecutionRuntimeDescriptor>{
  const row=await db.prepare(`UPDATE execution_runtimes SET state=?,last_heartbeat_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE tenant_id=? AND id=? RETURNING *`).bind(state,tenantId,runtimeId).first<RuntimeRow>();
  if(!row)throw new Error('Execution runtime not registered');return mapRuntime(row);
}

export async function listEligibleExecutionRuntimes(db:D1Database,tenantId:string,capability:ExecutionRuntimeCapability):Promise<ExecutionRuntimeDescriptor[]>{
  const rows=await db.prepare(`SELECT * FROM execution_runtimes WHERE tenant_id=? AND state='online' AND last_heartbeat_at>=datetime('now','-${RUNTIME_HEARTBEAT_TIMEOUT_SECONDS} seconds') ORDER BY last_heartbeat_at DESC`).bind(tenantId).all<RuntimeRow>();
  return(rows.results||[]).map(mapRuntime).filter(runtime=>runtime.capabilities.includes(capability));
}

export async function authorizeRuntimeExecution(db:D1Database,tenantId:string,request:RuntimeExecutionRequest):Promise<RuntimeExecutionResult>{
  const runtime=await db.prepare(`SELECT id FROM execution_runtimes WHERE tenant_id=? AND id=? AND state='online' AND last_heartbeat_at>=datetime('now','-${RUNTIME_HEARTBEAT_TIMEOUT_SECONDS} seconds')`).bind(tenantId,request.runtimeId).first<{id:string}>();
  if(!runtime)throw new Error('Execution runtime is unavailable');
  const row=await db.prepare(`INSERT INTO runtime_executions (id,tenant_id,runtime_id,graph_id,node_id,attempt_id,execution_version,capability,status,working_directory,command,args_json) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM task_graphs WHERE id=? AND tenant_id=? AND execution_version=? AND execution_owner IS NOT NULL AND lease_until>CURRENT_TIMESTAMP) ON CONFLICT(tenant_id,attempt_id) DO NOTHING RETURNING *`).bind(request.attemptId,tenantId,request.runtimeId,request.graphId,request.nodeId,request.attemptId,request.executionVersion,request.capability,'authorized',request.workingDirectory??null,request.command??null,request.args?JSON.stringify(request.args):null,request.graphId,tenantId,request.executionVersion).first<ExecutionRow>();
  if(row)return mapExecution(row);
  const existing=await db.prepare(`SELECT * FROM runtime_executions WHERE tenant_id=? AND attempt_id=?`).bind(tenantId,request.attemptId).first<ExecutionRow>();
  if(existing)return mapExecution(existing);
  throw new Error('Graph execution fence lost before runtime authorization');
}

export async function markRuntimeExecutionInFlight(db:D1Database,tenantId:string,request:RuntimeExecutionRequest):Promise<RuntimeExecutionResult>{
  const row=await db.prepare(`UPDATE runtime_executions SET status='in_flight',started_at=COALESCE(started_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE tenant_id=? AND id=? AND runtime_id=? AND graph_id=? AND node_id=? AND execution_version=? AND status='authorized' AND EXISTS (SELECT 1 FROM task_graphs WHERE id=? AND tenant_id=? AND execution_version=? AND execution_owner IS NOT NULL AND lease_until>CURRENT_TIMESTAMP) RETURNING *`).bind(tenantId,request.attemptId,request.runtimeId,request.graphId,request.nodeId,request.executionVersion,request.graphId,tenantId,request.executionVersion).first<ExecutionRow>();
  if(!row)throw new Error('Graph execution fence lost before runtime side effect');return mapExecution(row);
}

export async function completeRuntimeExecution(db:D1Database,tenantId:string,request:RuntimeExecutionRequest,result:RuntimeExecutionResult):Promise<RuntimeExecutionResult>{
  const row=await db.prepare(`UPDATE runtime_executions SET status=?,external_operation_id=?,stdout=?,stderr=?,exit_code=?,error=?,finished_at=?,updated_at=CURRENT_TIMESTAMP WHERE tenant_id=? AND id=? AND runtime_id=? AND execution_version=? AND status='in_flight' AND EXISTS (SELECT 1 FROM task_graphs WHERE id=? AND tenant_id=? AND execution_version=? AND execution_owner IS NOT NULL AND lease_until>CURRENT_TIMESTAMP) RETURNING *`).bind(result.outcome==='timed_out'?'timed_out':result.outcome==='unknown'?'unknown':result.outcome==='completed'?'completed':'failed',result.externalOperationId??null,(result.stdout||'').slice(0,100000),(result.stderr||'').slice(0,100000),result.exitCode??null,result.error?.slice(0,4000)??null,result.finishedAt,tenantId,request.attemptId,request.runtimeId,request.executionVersion,request.graphId,tenantId,request.executionVersion).first<ExecutionRow>();
  if(!row)throw new Error('Runtime execution completion rejected by execution fence');return mapExecution(row);
}

export async function getRuntimeExecution(db:D1Database,tenantId:string,attemptId:string):Promise<RuntimeExecutionResult|null>{const row=await db.prepare(`SELECT * FROM runtime_executions WHERE tenant_id=? AND attempt_id=?`).bind(tenantId,attemptId).first<ExecutionRow>();return row?mapExecution(row):null;}

export async function listRecoverableRuntimeExecutions(db:D1Database,tenantId:string,limit=50):Promise<RuntimeExecutionResult[]>{const safeLimit=Math.max(1,Math.min(100,Math.trunc(limit)));const rows=await db.prepare(`SELECT * FROM runtime_executions WHERE tenant_id=? AND status IN ('in_flight','unknown') ORDER BY updated_at ASC LIMIT ${safeLimit}`).bind(tenantId).all<ExecutionRow>();return(rows.results||[]).map(mapExecution);}
