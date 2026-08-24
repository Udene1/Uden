import { DOMAIN_KEYWORDS, COMPLEXITY_INDICATORS, ModelTier, TaskDomain, OutputFormat } from '@ai-work-partner/shared';

export interface ClassificationResult {
  complexity: number;
  domain: TaskDomain;
  recommendedTier: ModelTier;
  expectedFormat: OutputFormat;
  estimatedTokens: number;
}

function matchesKeyword(text: string, kw: string): boolean {
  if (kw.length <= 4) {
    return new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
  }
  return text.includes(kw);
}

export function classifyTask(prompt: string): ClassificationResult {
  const text = prompt.toLowerCase();

  // Rule-based domain identification
  let domain: TaskDomain = 'general';
  for (const [key, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some(kw => matchesKeyword(text, kw))) {
      domain = key as TaskDomain;
      break;
    }
  }

  // Base complexity
  let complexity = 1;

  // Domain baseline complexity
  if (domain === 'legal') {
    complexity += 5;
  } else if (domain === 'code' || domain === 'analysis' || domain === 'research') {
    complexity += 3;
  } else if (domain === 'planning') {
    complexity += 2;
  }

  // Length factor
  if (text.length > 500) complexity += 2;
  if (text.length > 2000) complexity += 3;

  // High complexity indicators
  if (COMPLEXITY_INDICATORS.highComplexity.some(kw => text.includes(kw))) {
    complexity += 2;
  }

  // Structured output requirement
  if (COMPLEXITY_INDICATORS.structuredOutput.some(kw => text.includes(kw))) {
    complexity += 1;
  }

  // Specific high-impact terms
  if (text.includes('contract') || text.includes('agreement') || text.includes('nda') || text.includes('indemnity')) {
    complexity += 2;
  }

  // Low complexity discount
  if (COMPLEXITY_INDICATORS.lowComplexity.some(kw => text.includes(kw))) {
    complexity -= 2;
  }

  // Clamp complexity
  complexity = Math.max(1, Math.min(10, complexity));

  const recommendedTier: ModelTier = complexity >= 8 ? 3 : complexity >= 4 ? 2 : 1;
  const expectedFormat: OutputFormat = text.includes('json') ? 'json' : (text.includes('code') ? 'code' : 'markdown');
  const estimatedTokens = Math.min(4000, Math.max(100, Math.ceil(text.length / 4)));

  return { complexity, domain, recommendedTier, expectedFormat, estimatedTokens };
}
