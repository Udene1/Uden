import { describe, it, expect } from 'vitest';
import { classifyTask } from '../src/services/classifier';

describe('Task Classifier', () => {
  it('classifies simple general queries into Tier 1 with low complexity', () => {
    const result = classifyTask('What is the capital of France?');
    expect(result.complexity).toBe(1);
    expect(result.recommendedTier).toBe(1);
    expect(result.expectedFormat).toBe('markdown');
    expect(result.estimatedTokens).toBeGreaterThan(0);
  });

  it('classifies coding and script prompts into code domain and elevated complexity', () => {
    const result = classifyTask('Write a Python function to parse JSON files and implement a binary search algorithm');
    expect(result.complexity).toBeGreaterThanOrEqual(4);
    expect(result.domain).toBe('code');
    expect(result.expectedFormat).toBe('json');
  });

  it('classifies legal / contract documents into Tier 3 with high complexity', () => {
    const result = classifyTask('Draft a non-disclosure agreement (NDA) and confidentiality contract with indemnification terms for an acquisition');
    expect(result.complexity).toBeGreaterThanOrEqual(8);
    expect(result.recommendedTier).toBe(3);
    expect(result.domain).toBe('legal');
  });

  it('identifies expected output format from keywords', () => {
    expect(classifyTask('Return the user profile as a valid JSON object').expectedFormat).toBe('json');
    expect(classifyTask('Write code for a quicksort function').expectedFormat).toBe('code');
    expect(classifyTask('Write a summary of the quarterly earnings report').expectedFormat).toBe('markdown');
  });
});
