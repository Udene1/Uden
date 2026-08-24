import { describe, it, expect } from 'vitest';
import { estimateCost, calculateSavings, MODEL_REGISTRY } from '@ai-work-partner/shared';

describe('Cost & Pricing Calculator', () => {
  it('calculates cost in cents accurately for budget models', () => {
    // gemini-2.5-flash: $0.075 input / $0.30 output per million tokens
    // 10,000 tokens in, 2,000 tokens out
    const cost = estimateCost('gemini-2.5-flash', 10000, 2000);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBe(0.14); // 0.14 cents
    expect(cost).toBeLessThan(1.0); // Less than 1 cent
  });

  it('calculates cost in cents accurately for premium models', () => {
    // claude-sonnet: $3.00 input / $15.00 output per million tokens
    // 100,000 tokens in, 10,000 tokens out
    const cost = estimateCost('claude-sonnet', 100000, 10000);
    expect(cost).toBeGreaterThan(0.4);
  });

  it('calculates non-negative savings compared to highest tier', () => {
    const flashCost = estimateCost('gemini-2.5-flash', 50000, 5000);
    const savings = calculateSavings(flashCost, 50000, 5000);
    expect(savings).toBeGreaterThan(0);
  });

  it('handles unknown model ID gracefully without crashing', () => {
    const cost = estimateCost('non-existent-model', 1000, 500);
    expect(cost).toBe(0);
  });

  it('ensures all registered models have positive input and output costs', () => {
    for (const [modelId, config] of Object.entries(MODEL_REGISTRY)) {
      expect(config.inputCostPerMillion).toBeGreaterThan(0);
      expect(config.outputCostPerMillion).toBeGreaterThan(0);
      expect(config.displayName).toBeDefined();
    }
  });
});
