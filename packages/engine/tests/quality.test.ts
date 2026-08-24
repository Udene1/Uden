import { describe, it, expect } from 'vitest';
import { checkQuality } from '../src/services/quality';

describe('Quality Evaluator', () => {
  it('fails empty or minimal output (<20 chars) and triggers escalation', () => {
    const report = checkQuality('Too short', 'markdown', 'Write an essay');
    expect(report.passed).toBe(false);
    expect(report.shouldEscalate).toBe(true);
    expect(report.checks.find(c => c.name === 'Empty/Minimal Check')?.passed).toBe(false);
  });

  it('detects refusal patterns and flags for escalation', () => {
    const refusalOutput = "I apologize, but as an AI language model, I cannot provide legal advice.";
    const report = checkQuality(refusalOutput, 'markdown', 'Draft legal contract');
    expect(report.passed).toBe(false);
    expect(report.shouldEscalate).toBe(true);
    expect(report.checks.find(c => c.name === 'Refusal Check')?.passed).toBe(false);
  });

  it('detects unclosed code fences and truncation', () => {
    const truncatedOutput = "Here is the code you requested:\n```typescript\nfunction example() {\n  return 42;\n";
    const report = checkQuality(truncatedOutput, 'code', 'Write a function');
    expect(report.shouldEscalate).toBe(true);
    expect(report.checks.find(c => c.name === 'Truncation Check')?.passed).toBe(false);
  });

  it('detects excessive repetitive text loops', () => {
    const repeated = ("the same phrase " .repeat(20)).trim();
    const report = checkQuality(repeated, 'markdown', 'Write content');
    expect(report.shouldEscalate).toBe(true);
    expect(report.checks.find(c => c.name === 'Repetition Check')?.passed).toBe(false);
  });

  it('validates JSON structure when json format is expected', () => {
    const validJsonOutput = '{\n  "status": "success",\n  "data": [1, 2, 3]\n}';
    const report = checkQuality(validJsonOutput, 'json', 'Provide JSON data');
    expect(report.checks.find(c => c.name === 'Format Check')?.passed).toBe(true);

    const invalidJsonOutput = 'Here is the response without any brackets or braces';
    const failedReport = checkQuality(invalidJsonOutput, 'json', 'Provide JSON data');
    expect(failedReport.checks.find(c => c.name === 'Format Check')?.passed).toBe(false);
  });

  it('passes comprehensive, well-structured output without escalation', () => {
    const highQualityOutput = `## Strategic Analysis
Here is a comprehensive breakdown of the Q3 performance metrics:
1. Revenue increased by 14% quarter-over-quarter.
2. Customer retention remained resilient at 96.5%.
3. Expansion into new regional markets exceeded initial projections.

### Recommendations
Continue investing in developer tooling and automation pipelines.`;

    const report = checkQuality(highQualityOutput, 'markdown', 'Analyze Q3 metrics');
    expect(report.passed).toBe(true);
    expect(report.shouldEscalate).toBe(false);
    expect(report.overallScore).toBeGreaterThanOrEqual(80);
  });
});
