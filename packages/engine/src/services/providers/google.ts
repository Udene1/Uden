import { Env } from '../../types';
import { ProviderExecutionOptions, ProviderExecutionResult } from './index';

export class GoogleProvider {
  constructor(private env: Env) {}

  async execute(prompt: string, modelId: string, options?: ProviderExecutionOptions): Promise<ProviderExecutionResult> {
    const apiKey = this.env.GEMINI_API_KEY || this.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY or GOOGLE_AI_API_KEY is not configured');
    }

    const startTime = Date.now();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    const body: Record<string, any> = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    if (options?.systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: options.systemPrompt }]
      };
    }

    const generationConfig: Record<string, any> = {};
    if (options?.temperature !== undefined) {
      generationConfig.temperature = options.temperature;
    }
    if (options?.maxTokens) {
      generationConfig.maxOutputTokens = options.maxTokens;
    }
    if (Object.keys(generationConfig).length > 0) {
      body.generationConfig = generationConfig;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000)
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`Google AI error (${res.status}): ${errorText}`);
    }

    const data = await res.json() as any;
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.[0]?.text || '';

    return {
      result: textPart,
      promptTokens: data.usageMetadata?.promptTokenCount || 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      finishReason: candidate?.finishReason || 'STOP',
      latencyMs
    };
  }
}
