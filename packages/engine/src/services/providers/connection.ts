import type { Env } from '../../types';

export type ModelConnection = 'native' | 'agentrouter' | 'nvidia';

export interface ParsedModelReference {
  modelId: string;
  connection: ModelConnection;
}

export function parseModelReference(reference: string): ParsedModelReference {
  const value = reference.trim();
  if (value.startsWith('nvidia/')) {
    const modelId = value.slice('nvidia/'.length).trim();
    if (!modelId) throw new Error('Invalid NVIDIA model reference');
    return { modelId, connection: 'nvidia' };
  }
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

type ModelFamily = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'unknown';

function modelFamily(modelId: string): ModelFamily {
  const value = modelId.toLowerCase().replace(/^agentrouter\//, '');
  if (/^(openai\/|gpt|o[34](?:-|$))/.test(value)) return 'openai';
  if (/^(anthropic\/|claude)/.test(value)) return 'anthropic';
  if (/^(google\/|gemini)/.test(value)) return 'google';
  if (/^(deepseek\/|deepseek)/.test(value)) return 'deepseek';
  return 'unknown';
}

/**
 * Resolve the router's abstract model preferences against the live AgentRouter
 * catalogue. The requested model IDs are preferences only; they are never sent
 * to AgentRouter when discovery provides a live catalogue.
 *
 * AgentRouter remains a first-class connection. Native candidates are retained
 * after the discovered AgentRouter candidates so a separately configured native
 * provider can still serve as a fallback.
 */
export async function resolveConnectionCandidates(
  env: Env,
  preferredModels: string[],
): Promise<string[]> {
  const nativeCandidates = [...new Set(preferredModels.filter(Boolean))];
  if (!env.AGENTROUTER_API_KEY) return nativeCandidates;

  let discovered: string[];
  try {
    discovered = await discoverAgentRouterModels(env);
  } catch {
    // AgentRouter is still the configured connection even when catalogue
    // discovery is temporarily unavailable (for example a gateway/WAF issue).
    // Preserve the router's abstract model preference and let the provider
    // return model-not-found if that preference is not currently available.
    return [...new Set([
      ...nativeCandidates.map((model) => model.startsWith('agentrouter/') ? model : `agentrouter/${model}`),
      ...nativeCandidates,
    ])];
  }
  if (!discovered.length) {
    return [...new Set([
      ...nativeCandidates.map((model) => model.startsWith('agentrouter/') ? model : `agentrouter/${model}`),
      ...nativeCandidates,
    ])];
  }

  const unused = new Set(discovered);
  const agentRouterCandidates: string[] = [];

  // Preserve the router's capability/family preference without pinning a model
  // version. For example, a DeepSeek preference selects whatever DeepSeek model
  // the current AgentRouter catalogue exposes.
  for (const preferred of nativeCandidates) {
    const family = modelFamily(preferred);
    if (family === 'unknown') continue;
    const match = discovered.find((modelId) => unused.has(modelId) && modelFamily(modelId) === family);
    if (match) {
      agentRouterCandidates.push(`agentrouter/${match}`);
      unused.delete(match);
    }
  }

  // If the catalogue does not expose a recognizable family, still use live
  // AgentRouter models rather than sending stale versioned IDs to native APIs.
  const targetCount = Math.max(1, nativeCandidates.length);
  for (const modelId of discovered) {
    if (agentRouterCandidates.length >= targetCount) break;
    if (unused.has(modelId)) {
      agentRouterCandidates.push(`agentrouter/${modelId}`);
      unused.delete(modelId);
    }
  }

  return [...new Set([...agentRouterCandidates, ...nativeCandidates])];
}
