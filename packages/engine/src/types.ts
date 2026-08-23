export interface Env {
  DB: D1Database;
  CACHE_KV: KVNamespace;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GEMINI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
}

export type HonoEnv = {
  Bindings: Env;
  Variables: {
    tenant: import('@ai-work-partner/shared').Tenant;
    tenantId: string;
  };
};
