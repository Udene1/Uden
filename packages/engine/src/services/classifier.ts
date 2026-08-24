import {
  DOMAIN_KEYWORDS,
  COMPLEXITY_INDICATORS,
  ModelTier,
  TaskDomain,
  OutputFormat,
  TOKENS_PER_WORD
} from '@ai-work-partner/shared';

export interface ClassificationResult {
  complexity: number;               // 1–10
  domain: TaskDomain;
  recommendedTier: ModelTier;
  expectedFormat: OutputFormat;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  matchedKeywords: string[];
  reasoning: string;
}

/** Regex escape helper */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Check if keyword matches as whole word or phrase */
function matchKeyword(text: string, kw: string): boolean {
  if (kw.length <= 4 || !kw.includes(' ')) {
    return new RegExp(`\\b${escapeRegex(kw)}\\b`, 'i').test(text);
  }
  return text.toLowerCase().includes(kw.toLowerCase());
}

/**
 * Domain-specific expected output token multipliers relative to input tokens.
 */
const DOMAIN_OUTPUT_MULTIPLIERS: Record<TaskDomain, number> = {
  legal: 2.5,
  research: 3.0,
  writing: 2.2,
  planning: 2.0,
  code: 2.5,
  analysis: 2.0,
  creative: 1.8,
  data: 1.5,
  email: 1.2,
  general: 1.2
};

export function classifyTask(prompt: string): ClassificationResult {
  const text = prompt.trim();
  const lowerText = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // ─────────────────────────────────────────────
  // 1. Weighted Multi-Domain Scoring
  // ─────────────────────────────────────────────
  const domainScores: Record<TaskDomain, { score: number; matches: string[] }> = {
    writing: { score: 0, matches: [] },
    code: { score: 0, matches: [] },
    analysis: { score: 0, matches: [] },
    legal: { score: 0, matches: [] },
    email: { score: 0, matches: [] },
    planning: { score: 0, matches: [] },
    research: { score: 0, matches: [] },
    creative: { score: 0, matches: [] },
    data: { score: 0, matches: [] },
    general: { score: 0.1, matches: [] } // baseline fallback
  };

  for (const [domainKey, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    const domain = domainKey as TaskDomain;
    for (const kw of keywords) {
      if (matchKeyword(lowerText, kw)) {
        // Multi-word phrases give higher domain confidence
        const weight = kw.includes(' ') ? 3 : 1.5;
        domainScores[domain].score += weight;
        domainScores[domain].matches.push(kw);
      }
    }
  }

  // Find dominant domain
  let topDomain: TaskDomain = 'general';
  let maxScore = 0;
  for (const [domainKey, entry] of Object.entries(domainScores)) {
    if (entry.score > maxScore) {
      maxScore = entry.score;
      topDomain = domainKey as TaskDomain;
    }
  }

  const matchedKeywords = domainScores[topDomain].matches;

  // ─────────────────────────────────────────────
  // 2. Structural & Semantic Complexity Scoring
  // ─────────────────────────────────────────────  // Base complexity
  let complexity = 1;

  // Domain baseline weights
  if (topDomain === 'legal') complexity += 5;
  else if (topDomain === 'research') complexity += 4;
  else if (topDomain === 'code' || topDomain === 'analysis') complexity += 3;
  else if (topDomain === 'planning') complexity += 2;

  // Prompt length & scope
  if (text.length > 100) complexity += 1;
  if (text.length > 500) complexity += 1;
  if (text.length > 1500) complexity += 2;

  // Count explicit requirements / constraints
  const numberedListCount = (text.match(/^\s*\d+[\.\)]/gm) || []).length;
  const bulletCount = (text.match(/^\s*[\-\*\•]/gm) || []).length;
  const constraintKeywords = (lowerText.match(/\b(must|require|ensure|shall|constraint|limit|do not|never)\b/g) || []).length;
  const totalConstraints = numberedListCount + bulletCount + constraintKeywords;

  if (totalConstraints >= 5) complexity += 2;
  else if (totalConstraints >= 2) complexity += 1;

  // High complexity indicators from constants
  const highComplexityMatches = COMPLEXITY_INDICATORS.highComplexity.filter(kw => matchKeyword(lowerText, kw));
  if (highComplexityMatches.length >= 2) complexity += 2;
  else if (highComplexityMatches.length === 1) complexity += 1;

  // Structured output requirement indicators from constants
  const structuredMatches = COMPLEXITY_INDICATORS.structuredOutput.filter(kw => matchKeyword(lowerText, kw));
  if (structuredMatches.length > 0) complexity += 1;

  // Reasoning & technical depth indicators
  if (/\b(architecture|tradeoff|optimization|benchmark|edge case|concurrency|security|vulnerability|audit)\b/i.test(lowerText)) {
    complexity += 2;
  }

  // Low complexity discount
  const lowComplexityMatches = COMPLEXITY_INDICATORS.lowComplexity.filter(kw => matchKeyword(lowerText, kw));
  if (lowComplexityMatches.length > 0 && totalConstraints < 2 && text.length < 300) {
    complexity -= 2;
  }

  // Final clamped complexity (1 to 10)
  complexity = Math.max(1, Math.min(10, complexity));

  // ─────────────────────────────────────────────
  // 3. Recommended Tier & Expected Format
  // ─────────────────────────────────────────────
  const recommendedTier: ModelTier = complexity >= 8 ? 3 : complexity >= 4 ? 2 : 1;

  let expectedFormat: OutputFormat = 'markdown';
  if (matchKeyword(lowerText, 'json') || /format.*json|return.*json/i.test(lowerText)) {
    expectedFormat = 'json';
  } else if (matchKeyword(lowerText, 'html')) {
    expectedFormat = 'html';
  } else if (topDomain === 'code' && (lowerText.includes('function') || lowerText.includes('script') || lowerText.includes('class') || lowerText.includes('sql'))) {
    expectedFormat = 'code';
  }

  // ─────────────────────────────────────────────
  // 4. Token Estimation
  // ─────────────────────────────────────────────
  const estimatedInputTokens = Math.max(10, Math.ceil(wordCount * TOKENS_PER_WORD));
  const multiplier = DOMAIN_OUTPUT_MULTIPLIERS[topDomain] || 1.5;
  const rawOutputEstimate = Math.ceil(estimatedInputTokens * multiplier * (complexity / 3));
  const estimatedOutputTokens = Math.min(8192, Math.max(100, rawOutputEstimate));

  const reasoning = `Classified as ${topDomain.toUpperCase()} domain with complexity ${complexity}/10 (Tier ${recommendedTier}). ` +
    `Found ${totalConstraints} constraints, ${highComplexityMatches.length} high-complexity signals. Expected format: ${expectedFormat}.`;

  return {
    complexity,
    domain: topDomain,
    recommendedTier,
    expectedFormat,
    estimatedInputTokens,
    estimatedOutputTokens,
    matchedKeywords,
    reasoning
  };
}
