import type { Env } from '../../types';

export type ModelConnection = 'native' | 'agentrouter';

export interface ParsedModelReference {
  modelId: string;
  connection: ModelConnection;
}

export function parseModelReference(reference: string): ParsedModelReference {
  const value = reference.trim();
  if (value.startsWith('agentrouter/')) {
    const modelId = value.slice('agentrouter/'.length).trim();
    if (!modelId) throw new Error('Invalid AgentRouter model reference');
    return { modelId, connection: 'agentrouter' };
  }
  return { modelId: value, connection: 'native' };
}

export function modelIdForRegistry(reference: string): string {
  return parseModelReference(reference).modelId;
}

const AGENTROUTER_MODELS_CACHE_KEY = 'agentrouter:model-catalog:v1';
const AGENTROUTER_MODELS_CACHE_TTL_SECONDS = 300;

function agentRouterModelsUrl(env: Env): string {
  const base = (env.AGENTROUTER_OPENAI_BASE_URL || 'https://co.agentrouter.org/v1').replace(/\/$/, '');
  return `${base}/models`;
}

export async function discoverAgentRouterModels(env: Env): Promise<string[]> {
  if (!env.AGENTROUTER_API_KEY) return [];
  const cached = await env.CACHE_KV.get(AGENTROUTER_MODELS_CACHE_KEY, 'json') as { models?: string[] } | null;
  if (cached?.models?.length) return cached.models;
  const response = await fetch(agentRouterModelsUrl(env), {
    headers: { Authorization: `Bearer ${env.AGENTROUTER_API_KEY}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`AgentRouter model discovery failed (${response.status})`);
  const payload = await response.json() as { data?: Array<{ id?: unknown }> };
  const models = Array.isArray(payload.data)
    ? payload.data.map((entry) => typeof entry.id === 'string' ? entry.id.trim() : '').filter(Boolean)
    : [];
  if (models.length) {
    await env.CACHE_KV.put(AGENTROUTER_MODELS_CACHE_KEY, JSON.stringify({ models }), { expirationTtl: AGENTROUTER_MODELS_CACHE_TTL_SECONDS });
  }
  return models;
}
