import {
  estimateCost,
  getDefaultRoutingChain,
  type NodeRoutingContext,
  type NodeRoutingDecision,
  type TaskNode,
} from '@ai-work-partner/shared';

/**
 * Route one graph node independently from the rest of the user request.
 * This is the key cost-control boundary: each unit gets the cheapest model
 * appropriate for its own complexity, domain, risk, and quality preference.
 */
export function routeGraphNode(
  node: TaskNode,
  context: NodeRoutingContext,
  estimatedInputTokens = 500,
  estimatedOutputTokens = 800
): NodeRoutingDecision {
  let tier = node.recommendedTier;

  if (context.riskLevel === 'critical' && tier < 3) tier = 3;
  else if (context.riskLevel === 'high' && tier < 2) tier = 2;

  if (context.qualityPreference === 'cost-optimized' && tier > 1) {
    tier = (tier - 1) as typeof tier;
  } else if (context.qualityPreference === 'quality-first' && tier < 3) {
    tier = (tier + 1) as typeof tier;
  }

  if (context.budgetLeftCents < 50 && tier > 1) tier = 1;

  const chain = getDefaultRoutingChain(tier, context.qualityPreference, node.domain);
  const primaryModel = chain[0] || 'gpt-4o-mini';
  const fallbackChain = chain.slice(1);
  const estimatedCostCents = estimateCost(primaryModel, estimatedInputTokens, estimatedOutputTokens);

  return {
    nodeId: node.id,
    primaryModel,
    fallbackChain,
    estimatedCostCents,
    reasoning:
      `Node "${node.title}" routed independently: ${node.domain} domain, ` +
      `complexity ${node.complexity}/10, tier ${tier}, ${context.qualityPreference} preference. ` +
      `Estimated usage ~${estimatedInputTokens} in / ~${estimatedOutputTokens} out (${estimatedCostCents}¢).`,
  };
}
