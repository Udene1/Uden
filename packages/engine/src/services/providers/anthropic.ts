import { Env } from '../../types';

export class AnthropicProvider {
  constructor(private env: Env) {}

  async execute(prompt: string, modelId: string) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    if (!res.ok) throw new Error(`Anthropic error: ${await res.text()}`);
    
    const data = await res.json() as any;
    return {
      result: data.content[0].text,
      promptTokens: data.usage?.input_tokens || 0,
      completionTokens: data.usage?.output_tokens || 0
    };
  }
}
