import { Env } from '../../types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GoogleProvider } from './google';
import { DeepSeekProvider } from './deepseek';

export interface ProviderExecutionOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ProviderExecutionResult {
  result: string;
  promptTokens: number;
  completionTokens: number;
  finishReason?: string;
  latencyMs?: number;
}

export interface AIProvider {
  execute(
    prompt: string,
    modelId: string,
    options?: ProviderExecutionOptions
  ): Promise<ProviderExecutionResult>;
}

export function getProvider(env: Env, modelId: string): AIProvider {
  if (modelId.startsWith('gpt') || modelId.startsWith('o3')) {
    return new OpenAIProvider(env);
  } else if (modelId.startsWith('claude')) {
    return new AnthropicProvider(env);
  } else if (modelId.startsWith('gemini')) {
    return new GoogleProvider(env);
  } else if (modelId.startsWith('deepseek')) {
    return new DeepSeekProvider(env);
  }
  throw new Error(`Unsupported model ID: ${modelId}`);
}
