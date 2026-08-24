import { describe, it, expect } from 'vitest';
import { classifyTask } from '../src/services/classifier';

describe('Task Classifier (Upgraded)', () => {
  it('classifies simple general queries into Tier 1 with low complexity', () => {
    const result = classifyTask('What is the capital of France?');
    expect(result.complexity).toBe(1);
    expect(result.recommendedTier).toBe(1);
    expect(result.domain).toBe('general');
    expect(result.expectedFormat).toBe('markdown');
    expect(result.estimatedInputTokens).toBeGreaterThan(0);
    expect(result.estimatedOutputTokens).toBeGreaterThan(0);
  });

  it('classifies coding and algorithm tasks into code domain with elevated complexity', () => {
    const result = classifyTask('Write a TypeScript function to parse and validate incoming JSON payloads with a binary search algorithm');
    expect(result.complexity).toBeGreaterThanOrEqual(4);
    expect(result.domain).toBe('code');
    expect(result.expectedFormat).toBe('json');
    expect(result.matchedKeywords.length).toBeGreaterThan(0);
  });

  it('classifies legal / contract documents into Tier 3 with high complexity', () => {
    const prompt = 'Draft a comprehensive non-disclosure agreement (NDA) and confidentiality contract with indemnification and liability terms for an enterprise acquisition';
    const result = classifyTask(prompt);
    expect(result.complexity).toBeGreaterThanOrEqual(8);
    expect(result.recommendedTier).toBe(3);
    expect(result.domain).toBe('legal');
  });

  it('calculates higher complexity for prompts with multiple explicit constraints and numbered lists', () => {
    const prompt = `Please design a microservice backend architecture:
1. Must handle 10,000 requests per second.
2. Require zero-downtime database migrations.
3. Ensure all endpoints are authenticated with JWT.
4. Shall implement distributed tracing.
5. Must include Docker compose configuration.`;

    const result = classifyTask(prompt);
    expect(result.complexity).toBeGreaterThanOrEqual(7);
    expect(result.reasoning).toContain('constraints');
  });

  it('detects low complexity signals and applies discounts for quick one-liners', () => {
    const simple = classifyTask('Quick fix for a minor typo in the welcome message');
    expect(simple.complexity).toBeLessThanOrEqual(2);
    expect(simple.recommendedTier).toBe(1);
  });

  it('accurately estimates input and output tokens with domain multipliers', () => {
    const shortTask = classifyTask('Short email');
    const researchTask = classifyTask('Conduct an in-depth, comprehensive research survey on quantum computing error mitigation techniques with literature review');

    expect(researchTask.estimatedOutputTokens).toBeGreaterThan(shortTask.estimatedOutputTokens);
    expect(researchTask.estimatedInputTokens).toBeGreaterThan(shortTask.estimatedInputTokens);
  });
});
