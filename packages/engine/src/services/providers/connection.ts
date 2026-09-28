export type ModelConnection = 'native' | 'agentrouter';

export interface ParsedModelReference {
  modelId: string;
  connection: ModelConnection;
}

/**
 * Persisted model references may optionally select a transport connection:
 *   deepseek-v3                 -> native DeepSeek API
 *   agentrouter/deepseek-v3     -> AgentRouter OpenAI-compatible API
 *   agentrouter/claude-sonnet   -> AgentRouter Anthropic-compatible API
 *
 * Keeping the connection in the model reference makes retries/recovery durable:
 * the same external route is selected after a Worker reclaim.
 */
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
