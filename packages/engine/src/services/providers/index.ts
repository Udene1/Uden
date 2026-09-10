import { Env } from '../../types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GoogleProvider } from './google';
import { DeepSeekProvider } from './deepseek';
import { sanitizeProviderError } from '../provider-errors';

export interface ProviderExecutionOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  idempotencyKey?: string;
}
export interface ProviderExecutionResult { result: string; promptTokens: number; completionTokens: number; finishReason?: string; latencyMs?: number; }
export interface AIProvider { execute(prompt: string, modelId: string, options?: ProviderExecutionOptions): Promise<ProviderExecutionResult>; }

export function getProvider(env: Env, modelId: string): AIProvider {
  let provider: AIProvider;
  if (modelId.startsWith('gpt') || modelId.startsWith('o3')) provider = new OpenAIProvider(env);
  else if (modelId.startsWith('claude')) provider = new AnthropicProvider(env);
  else if (modelId.startsWith('gemini')) provider = new GoogleProvider(env);
  else if (modelId.startsWith('deepseek')) provider = new DeepSeekProvider(env);
  else throw new Error(`Unsupported model ID: ${modelId}`);

  const name = modelId.startsWith('gpt') || modelId.startsWith('o3') ? 'openai' : modelId.startsWith('claude') ? 'anthropic' : modelId.startsWith('gemini') ? 'google' : 'deepseek';
  return {
    execute: async (prompt, id, options) => {
      try { return await provider.execute(prompt, id, options); }
      catch (error) { throw sanitizeProviderError(name, error); }
    },
  };
}
