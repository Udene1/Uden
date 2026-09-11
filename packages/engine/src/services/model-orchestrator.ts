import type { TaskNode } from '@ai-work-partner/shared';
import { routeGraphNode } from './graph-router';
import { deriveCapabilityPolicy } from './capability-policy';

export interface OrchestrationDecision {
  model: string;
  fallbacks: string[];
  riskLevel: 'low'|'medium'|'high'|'critical';
  approvalRequired: boolean;
  runtimeRequired: boolean;
  reasoning: string;
}

export function orchestrateNode(node: TaskNode, options: { qualityPreference: 'cost-optimized'|'balanced'|'quality-first'; budgetLeftCents: number }): OrchestrationDecision {
  const policy = deriveCapabilityPolicy(node);
  const routing = routeGraphNode(node, { qualityPreference: options.qualityPreference, budgetLeftCents: options.budgetLeftCents, riskLevel: policy.riskLevel });
  return {
    model: routing.primaryModel,
    fallbacks: routing.fallbackChain,
    riskLevel: policy.riskLevel,
    approvalRequired: policy.approvalRequired,
    runtimeRequired: Boolean(policy.capability),
    reasoning: `${routing.reasoning} Runtime=${policy.capability ?? 'none'}; approval=${policy.approvalRequired ? 'required' : 'not-required'}.`,
  };
}

export function shouldEscalate(node: TaskNode, qualityScore: number): boolean {
  const threshold = node.complexity >= 8 ? 0.85 : node.complexity >= 5 ? 0.75 : 0.65;
  return qualityScore < threshold;
}
