import { Env } from '../../types';

export class OpenAIProvider {
  constructor(private env: Env) {}

  async execute(prompt: string, modelId: string) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`);
    
    const data = await res.json() as any;
    return {
      result: data.choices[0].message.content,
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0
    };
  }
}
