import { Tenant } from '@ai-work-partner/shared';

export interface GraphExecutionQueueMessage {
  tenantId: string;
  graphId: string;
  enqueuedAt: string;
}

export interface Env {
  DB: D1Database;
  CACHE_KV: KVNamespace;
  TASK_GRAPH_QUEUE?: Queue<GraphExecutionQueueMessage>;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GEMINI_API_KEY?: string;
  GOOGLE_AI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
}

export type HonoEnv = {
  Bindings: Env;
  Variables: {
    tenant: Tenant;
    tenantId: string;
  };
};
