import { DOMAIN_KEYWORDS, ModelTier, TaskDomain, OutputFormat } from '@ai-work-partner/shared';

export interface ClassificationResult {
  complexity: number;
  domain: TaskDomain;
  recommendedTier: ModelTier;
  expectedFormat: OutputFormat;
  estimatedTokens: number;
}

export function classifyTask(prompt: string): ClassificationResult {
  const text = prompt.toLowerCase();

  // Rule-based complexity
  let complexity = 1;
  if (text.length > 500) complexity += 2;
  if (text.length > 2000) complexity += 3;
  if (text.includes('analyze') || text.includes('synthesize') || text.includes('compare')) complexity += 2;
  if (text.includes('code') || text.includes('script') || text.includes('function') || text.includes('algorithm')) complexity += 2;
  if (text.includes('contract') || text.includes('agreement') || text.includes('legal')) complexity += 3;
  if (complexity > 10) complexity = 10;

  // Rule-based domain
  let domain: TaskDomain = 'general';
  for (const [key, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      domain = key as TaskDomain;
      break;
    }
  }

  const recommendedTier: ModelTier = complexity >= 8 ? 3 : complexity >= 4 ? 2 : 1;
  const expectedFormat: OutputFormat = text.includes('json') ? 'json' : (text.includes('code') ? 'code' : 'markdown');
  const estimatedTokens = Math.min(4000, Math.max(100, Math.ceil(text.length / 4)));

  return { complexity, domain, recommendedTier, expectedFormat, estimatedTokens };
}
