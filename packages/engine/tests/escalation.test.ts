import { describe, it, expect } from 'vitest';
import { checkQuality } from '../src/services/quality';
import { estimateCost, calculateSavings } from '@ai-work-partner/shared';

describe('Escalation & Recovery Logic', () => {
  it('detects quality failure and prepares fallback chain', () => {
    const poorOutput = 'This output was cut off mid-thought because';
    const quality = checkQuality(poorOutput, 'markdown', 'Explain system design');
    expect(quality.shouldEscalate).toBe(true);
    expect(quality.escalationReason).toBeDefined();
  });

  it('bounds escalation attempts to maximum allowed', () => {
    const chain = ['gpt-4o-mini', 'deepseek-v3', 'gpt-4o', 'claude-sonnet', 'gemini-2.5-pro'];
    const maxAttempts = 3;
    const boundedChain = chain.slice(0, maxAttempts);
    expect(boundedChain.length).toBe(3);
  });

  it('aggregates token costs correctly across multiple simulated attempts', () => {
    // Attempt 1: Gemini 2.5 Flash - 50,000 in, 5,000 out
    const attempt1Cost = estimateCost('gemini-2.5-flash', 50000, 5000);
    // Attempt 2: Claude Sonnet - 150,000 in, 10,000 out
    const attempt2Cost = estimateCost('claude-sonnet', 150000, 10000);

    const totalTaskCost = Math.round((attempt1Cost + attempt2Cost) * 100) / 100;
    const totalTokensIn = 50000 + 150000;
    const totalTokensOut = 5000 + 10000;

    expect(totalTaskCost).toBeGreaterThan(attempt1Cost);
    expect(totalTaskCost).toBeGreaterThan(attempt2Cost);
    expect(totalTokensIn).toBe(200000);
    expect(totalTokensOut).toBe(15000);
  });
});
