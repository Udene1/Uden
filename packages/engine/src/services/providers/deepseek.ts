import { Env } from '../../types';
import { ProviderExecutionOptions, ProviderExecutionResult } from './index';

export class DeepSeekProvider {
  constructor(private env: Env) {}

  async execute(prompt: string, modelId: string, options?: ProviderExecutionOptions): Promise<ProviderExecutionResult> {
    if (!this.env.DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY is not configured');
    }

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const startTime = Date.now();
    const body: Record<string, any> = {
      model: modelId,
      messages
    };

    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }
    if (options?.maxTokens) {
      body.max_tokens = options.maxTokens;
    }

    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000)
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`DeepSeek error (${res.status}): ${errorText}`);
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
