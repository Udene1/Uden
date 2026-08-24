import {
  getDefaultRoutingChain,
  RoutingPlan,
  ModelTier,
  QualityPreference,
  TaskDomain,
  estimateCost
} from '@ai-work-partner/shared';

export function routeTask(
  complexity: number,
  domain: TaskDomain,
  qualityPref: QualityPreference = 'balanced',
  budgetLeftCents: number = 10000,
  estimatedInputTokens: number = 250,
  estimatedOutputTokens: number = 500
): RoutingPlan {
  // Determine base tier from complexity
  let baseTier: ModelTier = complexity >= 8 ? 3 : complexity >= 4 ? 2 : 1;

  // Downgrade tier if budget is critically low (< $0.50)
  if (budgetLeftCents < 50 && baseTier > 1) {
    baseTier = 1;
  }

  const chain = getDefaultRoutingChain(baseTier, qualityPref, domain);
  const primaryModel = chain[0] || 'gpt-4o-mini';
  const fallbackChain = chain.slice(1);

  // Calculate real dynamic estimated cost using model registry pricing
  const estimatedCostCents = estimateCost(primaryModel, estimatedInputTokens, estimatedOutputTokens);

  return {
    primaryModel,
    fallbackChain,
    estimatedCostCents,
    reasoning: `Routed to ${primaryModel} based on complexity ${complexity}/10 (${domain} domain) and ${qualityPref} preference. Estimated token usage: ~${estimatedInputTokens} in / ~${estimatedOutputTokens} out (${estimatedCostCents}¢).`
  };
}
