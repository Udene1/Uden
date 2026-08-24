import { describe, it, expect } from 'vitest';
import { routeTask } from '../src/services/router';

describe('Task Router (Upgraded)', () => {
  it('routes low complexity tasks to budget tier models with dynamic pricing', () => {
    const plan = routeTask(2, 'general', 'cost-optimized', 10000, 100, 200);
    expect(plan.primaryModel).toBeDefined();
    expect(plan.fallbackChain.length).toBeGreaterThan(0);
    expect(plan.estimatedCostCents).toBeGreaterThan(0);
    expect(plan.estimatedCostCents).toBeLessThan(0.5); // Fractions of a cent
  });

  it('routes high complexity tasks to premium tier models with realistic cost estimates', () => {
    const plan = routeTask(9, 'legal', 'quality-first', 10000, 500, 1500);
    expect(plan.primaryModel).toBeDefined();
    expect(['claude-sonnet', 'gpt-4o', 'gemini-2.5-pro']).toContain(plan.primaryModel);
    expect(plan.estimatedCostCents).toBeGreaterThan(0.5);
  });

  it('downgrades to Tier 1 when budget is critically low (< $0.50 / 50 cents)', () => {
    const lowBudgetPlan = routeTask(9, 'code', 'quality-first', 30, 200, 500); // 30 cents left
    expect(lowBudgetPlan.estimatedCostCents).toBeLessThanOrEqual(0.5);
  });

  it('includes explanatory reasoning with token counts in the routing plan', () => {
    const plan = routeTask(5, 'analysis', 'balanced', 5000, 300, 600);
    expect(plan.reasoning).toContain('5/10');
    expect(plan.reasoning).toContain('300 in');
    expect(plan.reasoning).toContain('600 out');
  });
});
