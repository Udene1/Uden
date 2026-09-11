import type { D1Database } from '@cloudflare/workers-types';

const REQUIRED:Record<string,string[]>={
  task_graph_attempts:['UNIQUE (graph_id,node_id,attempt_number)','idx_task_graph_attempts_idempotency_key'],
  runtime_executions:['UNIQUE (tenant_id,attempt_id)'],
  repository_operations:['idx_repository_operations_idempotency'],
  budget_reservations:['uq_budget_reservation_reference'],
  usage_records:['PRIMARY KEY'],
  project_files:['PRIMARY KEY'],
};

export async function auditIdempotencyConstraints(db:D1Database):Promise<void>{const tables=await db.prepare(`SELECT name,sql FROM sqlite_master WHERE type IN ('table','index')`).all<{name:string;sql:string|null}>();const sql=(tables.results||[]).map(row=>`${row.name}\n${row.sql||''}`).join('\n').toLowerCase();const compact=sql.replace(/\s+/g,'');const missing:string[]=[];for(const [table,requirements] of Object.entries(REQUIRED))for(const requirement of requirements){const normalized=requirement.replace(/\s+/g,'').toLowerCase();if(!compact.includes(normalized))missing.push(`${table}:${requirement}`);}if(missing.length)throw new Error(`Idempotency audit failed; missing durable constraints: ${missing.join(', ')}`);}
