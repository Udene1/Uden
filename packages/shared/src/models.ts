// ─────────────────────────────────────────────
// AI Model Registry — Pricing & Capabilities
// ─────────────────────────────────────────────

import type { ModelConfig, ModelTier, QualityPreference, TaskDomain } from './types';

/**
 * Complete model registry with pricing (costs in cents per million tokens).
 * Pricing is approximate as of mid-2026 — update as providers change rates.
 */
export const MODEL_REGISTRY: Record<string, ModelConfig> = {
  // ── Tier 1: Budget ─────────────────────────
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    provider: 'google',
    displayName: 'Gemini 2.5 Flash',
    tier: 1,
    inputCostPerMillion: 7.5,      // $0.075 → 7.5 cents
    outputCostPerMillion: 30,       // $0.30 → 30 cents
    maxInputTokens: 1048576,
    maxOutputTokens: 8192,
    strengths: ['general', 'email', 'data'],
    supportsStreaming: true,
    enabled: true,
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    provider: 'openai',
    displayName: 'GPT-4o Mini',
    tier: 1,
    inputCostPerMillion: 15,        // $0.15
    outputCostPerMillion: 60,       // $0.60
    maxInputTokens: 128000,
    maxOutputTokens: 16384,
    strengths: ['writing', 'email', 'code', 'general'],
    supportsStreaming: true,
    enabled: true,
  },
  'claude-haiku': {
    id: 'claude-haiku',
    provider: 'anthropic',
    displayName: 'Claude Haiku',
    tier: 1,
    inputCostPerMillion: 25,        // $0.25
    outputCostPerMillion: 125,      // $1.25
    maxInputTokens: 200000,
    maxOutputTokens: 4096,
    strengths: ['writing', 'analysis', 'data'],
    supportsStreaming: true,
    enabled: true,
  },

  // ── Tier 2: Mid ────────────────────────────
  'deepseek-v3': {
    id: 'deepseek-v3',
    provider: 'deepseek',
    displayName: 'DeepSeek V3',
    tier: 2,
    inputCostPerMillion: 27,        // $0.27
    outputCostPerMillion: 110,      // $1.10
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
    strengths: ['code', 'analysis', 'data', 'research'],
    supportsStreaming: true,
    enabled: true,
  },
  'o3-mini': {
    id: 'o3-mini',
    provider: 'openai',
    displayName: 'o3-mini',
    tier: 2,
    inputCostPerMillion: 110,       // $1.10
    outputCostPerMillion: 440,      // $4.40
    maxInputTokens: 128000,
    maxOutputTokens: 65536,
    strengths: ['code', 'analysis', 'planning', 'research'],
    supportsStreaming: true,
    enabled: true,
  },

  // ── Tier 3: Premium ────────────────────────
  'gemini-2.5-pro': {
    id: 'gemini-2.5-pro',
    provider: 'google',
    displayName: 'Gemini 2.5 Pro',
    tier: 3,
    inputCostPerMillion: 125,       // $1.25
    outputCostPerMillion: 1000,     // $10.00
    maxInputTokens: 1048576,
    maxOutputTokens: 8192,
    strengths: ['research', 'analysis', 'planning', 'creative'],
    supportsStreaming: true,
    enabled: true,
  },
  'gpt-4o': {
    id: 'gpt-4o',
    provider: 'openai',
    displayName: 'GPT-4o',
    tier: 3,
    inputCostPerMillion: 250,       // $2.50
    outputCostPerMillion: 1000,     // $10.00
    maxInputTokens: 128000,
    maxOutputTokens: 16384,
    strengths: ['writing', 'creative', 'analysis', 'code'],
    supportsStreaming: true,
    enabled: true,
  },
  'claude-sonnet': {
    id: 'claude-sonnet',
    provider: 'anthropic',
    displayName: 'Claude Sonnet',
    tier: 3,
    inputCostPerMillion: 300,       // $3.00
    outputCostPerMillion: 1500,     // $15.00
    maxInputTokens: 200000,
    maxOutputTokens: 8192,
    strengths: ['writing', 'legal', 'analysis', 'code', 'creative'],
    supportsStreaming: true,
    enabled: true,
  },
};

/**
 * Get all models for a given tier, sorted by cost (cheapest first).
 */
export function getModelsByTier(tier: ModelTier): ModelConfig[] {
  return Object.values(MODEL_REGISTRY)
    .filter((m) => m.tier === tier && m.enabled)
    .sort((a, b) => a.inputCostPerMillion - b.inputCostPerMillion);
}

/**
 * Get models suited for a specific domain, sorted by tier then cost.
 */
export function getModelsForDomain(domain: TaskDomain): ModelConfig[] {
  return Object.values(MODEL_REGISTRY)
    .filter((m) => m.enabled && m.strengths.includes(domain))
    .sort((a, b) => a.tier - b.tier || a.inputCostPerMillion - b.inputCostPerMillion);
}

/**
 * Calculate the estimated cost in cents for a given model and token counts.
 */
export function estimateCost(modelId: string, tokensIn: number, tokensOut: number): number {
  const model = MODEL_REGISTRY[modelId];
  if (!model) return 0;
  const inputCost = (tokensIn / 1_000_000) * model.inputCostPerMillion;
  const outputCost = (tokensOut / 1_000_000) * model.outputCostPerMillion;
  return Math.round((inputCost + outputCost) * 100) / 100; // Round to 2 decimal cents
}

/**
 * Get the default routing chain for a given tier and quality preference.
 * Returns model IDs in order of attempt.
 */
export function getDefaultRoutingChain(
  tier: ModelTier,
  preference: QualityPreference,
  domain?: TaskDomain
): string[] {
  // Adjust effective tier based on preference
  let effectiveTier = tier;
  if (preference === 'cost-optimized' && tier > 1) {
    effectiveTier = (tier - 1) as ModelTier;
  } else if (preference === 'quality-first' && tier < 3) {
    effectiveTier = (tier + 1) as ModelTier;
  }

  // Build chain: primary tier → next tier up → premium
  const chains: Record<ModelTier, string[][]> = {
    1: [
      ['gemini-2.5-flash', 'gpt-4o-mini', 'claude-haiku'],
      ['gpt-4o-mini', 'deepseek-v3', 'o3-mini'],
      ['o3-mini', 'gpt-4o', 'claude-sonnet'],
    ],
    2: [
      ['deepseek-v3', 'o3-mini', 'gpt-4o-mini'],
      ['o3-mini', 'deepseek-v3', 'gpt-4o'],
      ['gpt-4o', 'claude-sonnet', 'gemini-2.5-pro'],
    ],
    3: [
      ['gemini-2.5-pro', 'gpt-4o', 'claude-sonnet'],
      ['gpt-4o', 'claude-sonnet', 'gemini-2.5-pro'],
      ['claude-sonnet', 'gpt-4o', 'gemini-2.5-pro'],
    ],
  };

  const tierChains = chains[effectiveTier];

  // If domain specified, prefer models strong in that domain
  if (domain) {
    const domainModels = getModelsForDomain(domain)
      .filter((m) => m.tier >= effectiveTier)
      .map((m) => m.id);
    if (domainModels.length >= 2) {
      return domainModels.slice(0, 3);
    }
  }

  // Default: use balanced chain (index 1)
  const preferenceIndex = preference === 'cost-optimized' ? 0 : preference === 'quality-first' ? 2 : 1;
  return tierChains[preferenceIndex];
}

/**
 * Calculate savings compared to always using the most expensive model.
 */
export function calculateSavings(actualCostCents: number, tokensIn: number, tokensOut: number): number {
  const premiumCost = estimateCost('claude-sonnet', tokensIn, tokensOut);
  return Math.max(0, Math.round((premiumCost - actualCostCents) * 100) / 100);
}
