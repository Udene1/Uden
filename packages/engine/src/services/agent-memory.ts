import type { HonoEnv } from '../types';

export type AgentMemoryKind = 'fact' | 'decision' | 'constraint' | 'preference' | 'lesson' | 'artifact';
export type AgentMemoryScope = 'tenant' | 'project' | 'graph' | 'node';

export interface AgentMemory {
  id: string;
  tenantId: string;
  projectId?: string;
  graphId?: string;
  nodeId?: string;
  kind: AgentMemoryKind;
  scope: AgentMemoryScope;
  key: string;
  content: string;
  sourceType: string;
  sourceId?: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

const MAX_CONTENT = 20_000;
const MAX_RESULTS = 20;
const MAX_CONTEXT_CHARS = 24_000;

function validScope(scope: AgentMemoryScope): boolean {
  return ['tenant', 'project', 'graph', 'node'].includes(scope);
}

function assertScopeIdentity(memory: Pick<AgentMemory, 'scope' | 'projectId' | 'graphId' | 'nodeId'>): void {
  if (!validScope(memory.scope)) throw new Error('Invalid memory scope');
  if (memory.scope === 'tenant' && (memory.projectId || memory.graphId || memory.nodeId)) throw new Error('Tenant memory cannot carry narrower scope identity');
  if (memory.scope === 'project' && (!memory.projectId || memory.graphId || memory.nodeId)) throw new Error('Project memory requires projectId and no narrower identity');
  if (memory.scope === 'graph' && (!memory.graphId || memory.nodeId)) throw new Error('Graph memory requires graphId and no nodeId');
  if (memory.scope === 'node' && (!memory.graphId || !memory.nodeId)) throw new Error('Node memory requires graphId and nodeId');
}

export async function remember(env: HonoEnv['Bindings'], tenantId: string, input: Omit<AgentMemory, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<AgentMemory> {
  if (!input.key.trim() || input.key.length > 500) throw new Error('Memory key is invalid');
  if (!input.content.trim() || input.content.length > MAX_CONTENT) throw new Error('Memory content is invalid');
  assertScopeIdentity(input);
  const confidence = Math.max(0, Math.min(1, input.confidence));
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO agent_memories (id,tenant_id,project_id,graph_id,node_id,kind,scope,key,content,source_type,source_id,confidence,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    ON CONFLICT(tenant_id,scope,project_id,graph_id,node_id,key) DO UPDATE SET id=excluded.id,kind=excluded.kind,content=excluded.content,source_type=excluded.source_type,source_id=excluded.source_id,confidence=excluded.confidence,updated_at=CURRENT_TIMESTAMP`)
    .bind(id,tenantId,input.projectId ?? null,input.graphId ?? null,input.nodeId ?? null,input.kind,input.scope,input.key.trim(),input.content,input.sourceType,input.sourceId ?? null,confidence).run();
  const row = await env.DB.prepare(`SELECT * FROM agent_memories
    WHERE tenant_id=? AND scope=? AND key=?
      AND (? IS NULL OR project_id=?)
      AND (? IS NULL OR graph_id=?)
      AND (? IS NULL OR node_id=?)`)
    .bind(tenantId,input.scope,input.key.trim(),input.projectId ?? null,input.projectId ?? null,input.graphId ?? null,input.graphId ?? null,input.nodeId ?? null,input.nodeId ?? null).first<any>();
  if (!row) throw new Error('Memory write was not durable');
  return mapMemory(row);
}

export async function recall(db: D1Database, tenantId: string, options: { projectId?: string; graphId?: string; nodeId?: string; scope?: AgentMemoryScope; query?: string; limit?: number }): Promise<AgentMemory[]> {
  const limit = Math.min(MAX_RESULTS, Math.max(1, options.limit ?? 10));
  const scope = options.scope;
  const query = options.query?.trim();
  let projectId = options.projectId;

  if (options.graphId) {
    const graph = await db.prepare('SELECT project_id FROM task_graphs WHERE id=? AND tenant_id=?').bind(options.graphId, tenantId).first<{ project_id: string | null }>();
    if (!graph) throw new Error('Cannot recall memory for unknown graph');
    if (projectId && graph.project_id && projectId !== graph.project_id) throw new Error('Graph does not belong to project');
    projectId = projectId ?? graph.project_id ?? undefined;
  }

  const rows = await db.prepare(`SELECT * FROM agent_memories
    WHERE tenant_id=?
      AND (? IS NULL OR scope=?)
      AND (scope='tenant' OR (scope='project' AND project_id=?) OR (scope IN ('graph','node') AND graph_id=?))
      AND (? IS NULL OR graph_id=? OR scope IN ('tenant','project'))
      AND (? IS NULL OR scope!='node' OR node_id=?)
      AND (? IS NOT NULL OR scope!='node')
      AND (? IS NULL OR lower(key || ' ' || content) LIKE lower('%' || ? || '%'))
    ORDER BY confidence DESC, updated_at DESC LIMIT ?`)
    .bind(
      tenantId,
      scope ?? null,
      scope ?? null,
      projectId ?? null,
      options.graphId ?? null,
      options.graphId ?? null,
      options.graphId ?? null,
      options.nodeId ?? null,
      options.nodeId ?? null,
      options.nodeId ?? null,
      query ?? null,
      query ?? null,
      limit,
    )
    .all<any>();
  return (rows.results ?? []).map(mapMemory);
}

export function formatMemoryContext(memories: AgentMemory[]): string {
  if (memories.length === 0) return '';
  const lines: string[] = ['## Durable memory'];
  let length = lines[0].length;
  for (const memory of memories) {
    const line = `- [${memory.kind}/${memory.scope}] ${memory.key}: ${memory.content}`;
    if (length + line.length + 1 > MAX_CONTEXT_CHARS) break;
    lines.push(line);
    length += line.length + 1;
  }
  return lines.join('\n');
}

function mapMemory(row: any): AgentMemory {
  return { id: row.id, tenantId: row.tenant_id, projectId: row.project_id ?? undefined, graphId: row.graph_id ?? undefined, nodeId: row.node_id ?? undefined, kind: row.kind, scope: row.scope, key: row.key, content: row.content, sourceType: row.source_type, sourceId: row.source_id ?? undefined, confidence: Number(row.confidence), createdAt: row.created_at, updatedAt: row.updated_at };
}
