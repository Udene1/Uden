import { Env } from '../../types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GoogleProvider } from './google';
import { DeepSeekProvider } from './deepseek';
import { parseModelReference } from './connection';
import { sanitizeProviderError } from '../provider-errors';

export interface ProviderExecutionOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  idempotencyKey?: string;
}
export interface ProviderExecutionResult { result: string; promptTokens: number; completionTokens: number; cachedTokens?: number; reasoningTokens?: number; actualModel?: string; requestId?: string; finishReason?: string; latencyMs?: number; }
export interface AIProvider { execute(prompt: string, modelId: string, options?: ProviderExecutionOptions): Promise<ProviderExecutionResult>; supportsIdempotencyKey?: boolean; }

function catalogProvider(modelId: string): 'openai' | 'anthropic' | 'google' | 'deepseek' | 'unknown' {
  const normalized = modelId.toLowerCase();
  if (normalized.startsWith('openai/') || normalized.startsWith('gpt') || normalized.startsWith('o3') || normalized.startsWith('o4')) return 'openai';
  if (normalized.startsWith('anthropic/') || normalized.startsWith('claude')) return 'anthropic';
  if (normalized.startsWith('google/') || normalized.startsWith('gemini')) return 'google';
  if (normalized.startsWith('deepseek/') || normalized.startsWith('deepseek')) return 'deepseek';
  return 'unknown';
}

export function getProvider(env: Env, modelReference: string): AIProvider {
  const { modelId, connection } = parseModelReference(modelReference);
  const providerName = catalogProvider(modelId);
  if (connection === 'agentrouter' && !env.AGENTROUTER_API_KEY) throw new Error('AGENTROUTER_API_KEY is not configured');

  let provider: AIProvider;
  // AgentRouter exposes a mixed live catalogue. Claude-family models use its
  // Anthropic-compatible endpoint; every other discovered model is sent through
  // its OpenAI-compatible endpoint. This deliberately does not hardcode model
  // versions or vendor lists.
  if (connection === 'agentrouter' && providerName === 'anthropic') provider = new AnthropicProvider(env);
  else if (connection === 'agentrouter') provider = new OpenAIProvider(env);
  else if (providerName === 'openai') provider = new OpenAIProvider(env);
  else if (providerName === 'anthropic') provider = new AnthropicProvider(env);
  else if (providerName === 'google') provider = new GoogleProvider(env);
  else if (providerName === 'deepseek') provider = new DeepSeekProvider(env);
  else throw new Error(`Unsupported model ID: ${modelId}`);

  return {
    supportsIdempotencyKey: providerName === 'openai' && connection === 'native',
    execute: async (prompt, id, options) => {
      try { return await provider.execute(prompt, id, options); }
      catch (error) { throw sanitizeProviderError(providerName, error); }
    },
  };
}
