import { Env } from '../../types';

export class GoogleProvider {
  constructor(private env: Env) {}

  async execute(prompt: string, modelId: string) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${this.env.GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    if (!res.ok) throw new Error(`Google error: ${await res.text()}`);
    
    const data = await res.json() as any;
    return {
      result: data.candidates[0].content.parts[0].text,
      promptTokens: data.usageMetadata?.promptTokenCount || 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount || 0
    };
  }
}
