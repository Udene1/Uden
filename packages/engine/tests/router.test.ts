import { describe, it, expect } from 'vitest';
import { routeTask } from '../src/services/router';

describe('Task Router', () => {
  it('routes low complexity tasks to budget tier models', () => {
    const plan = routeTask(2, 'general', 'cost-optimized');
    expect(plan.primaryModel).toBeDefined();
    expect(plan.fallbackChain.length).toBeGreaterThan(0);
    expect(plan.estimatedCostCents).toBeLessThanOrEqual(1);
  });

  it('routes high complexity tasks to premium tier models', () => {
    const plan = routeTask(9, 'legal', 'quality-first');
    expect(plan.primaryModel).toBeDefined();
    expect(['claude-sonnet', 'gpt-4o', 'gemini-2.5-pro']).toContain(plan.primaryModel);
    expect(plan.estimatedCostCents).toBeGreaterThanOrEqual(1);
  });

  it('downgrades to Tier 1 when budget is critically low (< $0.50 / 50 cents)', () => {
    const lowBudgetPlan = routeTask(9, 'code', 'quality-first', 30); // 30 cents left
    expect(lowBudgetPlan.estimatedCostCents).toBeLessThanOrEqual(0.5);
  });

  it('includes explanatory reasoning in the routing plan', () => {
    const plan = routeTask(5, 'analysis', 'balanced', 5000);
    expect(plan.reasoning).toContain('5/10');
    expect(plan.reasoning).toContain('balanced');
  });
});
