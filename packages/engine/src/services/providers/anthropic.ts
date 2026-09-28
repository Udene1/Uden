import { Env } from '../../types';
import { ProviderExecutionOptions, ProviderExecutionResult } from './index';
import { parseModelReference } from './connection';

export class AnthropicProvider {
  constructor(private env: Env) {}

  async execute(prompt: string, modelReference: string, options?: ProviderExecutionOptions): Promise<ProviderExecutionResult> {
    const { modelId, connection } = parseModelReference(modelReference);
    const apiKey = connection === 'agentrouter' ? this.env.AGENTROUTER_API_KEY : this.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(connection === 'agentrouter' ? 'AGENTROUTER_API_KEY is not configured' : 'ANTHROPIC_API_KEY is not configured');
    }

    const startTime = Date.now();
    const body: Record<string, any> = {
      model: modelId,
      max_tokens: options?.maxTokens || 4096,
      messages: [{ role: 'user', content: prompt }]
    };
    if (options?.systemPrompt) body.system = options.systemPrompt;
    if (options?.temperature !== undefined) body.temperature = options.temperature;

    const baseUrl = connection === 'agentrouter'
      ? (this.env.AGENTROUTER_ANTHROPIC_BASE_URL || 'https://co.agentrouter.org')
      : 'https://api.anthropic.com/v1';

    const res = await fetch(`${baseUrl.replace(/\\/$/, '')}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000)
    });

    const latencyMs = Date.now() - startTime;
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`${connection === 'agentrouter' ? 'AgentRouter Anthropic-compatible' : 'Anthropic'} error (${res.status}): ${errorText}`);
    }

    const data = await res.json() as any;
    const textBlock = data.content?.find((c: any) => c.type === 'text');
    return {
      result: textBlock?.text || '',
      promptTokens: data.usage?.input_tokens || 0,
      completionTokens: data.usage?.output_tokens || 0,
      finishReason: data.stop_reason || 'stop',
      latencyMs
    };
  }
}
