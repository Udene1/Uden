import {
  estimateCost,
  getDefaultRoutingChain,
  type NodeRoutingContext,
  type NodeRoutingDecision,
  type TaskNode,
} from '@ai-work-partner/shared';

function effectiveRisk(node: TaskNode, context: NodeRoutingContext): NodeRoutingContext['riskLevel'] {
  if (context.riskLevel) return context.riskLevel;
  const capability = node.runtimeCapability;
  if (capability === 'network.outbound' && node.preferredRuntimeKind === 'desktop_local') return 'critical';
  if (capability === 'filesystem.write' || capability === 'git.write' || capability === 'network.outbound') return 'high';
  return node.complexity >= 8 ? 'high' : 'medium';
}

/**
 * Route one graph node independently from the rest of the user request.
 * This is the key cost-control boundary: each unit gets the cheapest model
 * appropriate for its own complexity, domain, risk, and quality preference.
 * A recovered node may carry a durable resume model; that model wins so an
 * unresolved external attempt is never silently switched to another model.
 */
export function routeGraphNode(node: TaskNode, context: NodeRoutingContext, estimatedInputTokens = 500, estimatedOutputTokens = 800): NodeRoutingDecision {
  let tier = node.recommendedTier;
  const risk = effectiveRisk(node, context);
  if (risk === 'critical' && tier < 3) tier = 3;
  else if (risk === 'high' && tier < 2) tier = 2;
  if (context.qualityPreference === 'cost-optimized' && tier > 1) tier = (tier - 1) as typeof tier;
  else if (context.qualityPreference === 'quality-first' && tier < 3) tier = (tier + 1) as typeof tier;
  if (context.budgetLeftCents < 50 && tier > 1) tier = 1;

  const chain = getDefaultRoutingChain(tier, context.qualityPreference, node.domain);
  const resumeModel = (node as TaskNode & { resumeAttemptModel?: string }).resumeAttemptModel;
  const primaryModel = resumeModel || chain[0] || 'gpt-4o-mini';
  const fallbackChain = resumeModel ? chain.filter((model) => model !== resumeModel) : chain.slice(1);
  const estimatedCostCents = estimateCost(primaryModel, estimatedInputTokens, estimatedOutputTokens);
  return {
    nodeId: node.id,
    primaryModel,
    fallbackChain,
    estimatedCostCents,
    reasoning: `Node "${node.title}" routed independently: ${node.domain} domain, complexity ${node.complexity}/10, risk ${risk}, tier ${tier}, ${context.qualityPreference} preference.` + (resumeModel ? ` Reusing durable model ${resumeModel} for an unresolved external attempt.` : '') + ` Estimated usage ~${estimatedInputTokens} in / ~${estimatedOutputTokens} out (${estimatedCostCents}¢).`,
  };
}
