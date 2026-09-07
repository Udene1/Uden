import { Tenant } from '@ai-work-partner/shared';

export interface GraphExecutionQueueMessage { tenantId: string; graphId: string; enqueuedAt: string; }
export interface Env {
  DB: D1Database;
  CACHE_KV: KVNamespace;
  TASK_GRAPH_QUEUE?: Queue<GraphExecutionQueueMessage>;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GEMINI_API_KEY?: string;
  GOOGLE_AI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  ALERT_WEBHOOK_URL?: string;
  ALLOWED_ORIGINS?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  GOOGLE_TOKEN_ENCRYPTION_KEY?: string;
  PROJECT_RUNTIME_URL?: string;
  PROJECT_RUNTIME_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_REDIRECT_URI?: string;
  GITHUB_TOKEN_ENCRYPTION_KEY?: string;
}
export type HonoEnv = { Bindings: Env; Variables: { tenant: Tenant; tenantId: string; requestId: string; }; };
