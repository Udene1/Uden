import { Env } from '../../types';
import { ProviderExecutionOptions, ProviderExecutionResult } from './index';

export class AnthropicProvider {
  constructor(private env: Env) {}

  async execute(prompt: string, modelId: string, options?: ProviderExecutionOptions): Promise<ProviderExecutionResult> {
    if (!this.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const startTime = Date.now();
    const body: Record<string, any> = {
      model: modelId,
      max_tokens: options?.maxTokens || 4096,
      messages: [{ role: 'user', content: prompt }]
    };

    if (options?.systemPrompt) {
      body.system = options.systemPrompt;
    }
    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000)
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`Anthropic error (${res.status}): ${errorText}`);
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
