import { Env } from '../../types';
import { ProviderExecutionOptions, ProviderExecutionResult } from './index';
import { parseModelReference } from './connection';

export class OpenAIProvider {
  constructor(private env: Env) {}

  async execute(prompt: string, modelReference: string, options?: ProviderExecutionOptions): Promise<ProviderExecutionResult> {
    const { modelId, connection } = parseModelReference(modelReference);
    const apiKey = connection === 'agentrouter' ? this.env.AGENTROUTER_API_KEY : this.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(connection === 'agentrouter' ? 'AGENTROUTER_API_KEY is not configured' : 'OPENAI_API_KEY is not configured');
    }

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    if (options?.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const startTime = Date.now();
    const body: Record<string, any> = { model: modelId, messages };
    if (options?.temperature !== undefined && !modelId.startsWith('o3')) body.temperature = options.temperature;
    if (options?.maxTokens) body.max_tokens = options.maxTokens;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    if (options?.idempotencyKey && connection === 'native') headers['Idempotency-Key'] = options.idempotencyKey;

    const baseUrl = connection === 'agentrouter'
      ? (this.env.AGENTROUTER_OPENAI_BASE_URL || 'https://co.agentrouter.org/v1')
      : 'https://api.openai.com/v1';

    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000)
    });

    const latencyMs = Date.now() - startTime;
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`${connection === 'agentrouter' ? 'AgentRouter OpenAI-compatible' : 'OpenAI'} error (${res.status}): ${errorText}`);
    }

    const data = await res.json() as any;
    const choice = data.choices?.[0];
    return {
      result: choice?.message?.content || '',
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      finishReason: choice?.finish_reason || 'stop',
      latencyMs
    };
  }
}
