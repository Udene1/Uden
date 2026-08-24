import { describe, it, expect } from 'vitest';
import { checkQuality } from '../src/services/quality';

describe('Quality Evaluator (Upgraded)', () => {
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

  it('detects unclosed code fences and abrupt endings', () => {
    const truncatedOutput = "Here is the code you requested:\n```typescript\nfunction example() {\n  return 42;\n";
    const report = checkQuality(truncatedOutput, 'code', 'Write a function');
    expect(report.shouldEscalate).toBe(true);
    expect(report.checks.find(c => c.name === 'Truncation Check')?.passed).toBe(false);
  });

  it('detects 4-gram repetition loops using sliding n-gram analysis', () => {
    const loopSentence = 'the system will process and store data securely ';
    const repeated = loopSentence.repeat(6);
    const report = checkQuality(repeated, 'markdown', 'Describe the system architecture');
    expect(report.shouldEscalate).toBe(true);
    const repetitionCheck = report.checks.find(c => c.name === 'Repetition Check');
    expect(repetitionCheck?.passed).toBe(false);
    expect(repetitionCheck?.reason).toContain('repetitive phrase loop');
  });

  it('validates syntax and structure when json format is expected', () => {
    const validJsonOutput = 'Here is the requested data:\n{\n  "status": "success",\n  "count": 42\n}';
    const validReport = checkQuality(validJsonOutput, 'json', 'Provide JSON data');
    expect(validReport.checks.find(c => c.name === 'Format Check')?.passed).toBe(true);

    const malformedJsonOutput = '{\n  "status": "invalid json without closing quote\n}';
    const malformedReport = checkQuality(malformedJsonOutput, 'json', 'Provide JSON data');
    expect(malformedReport.checks.find(c => c.name === 'Format Check')?.passed).toBe(false);
    expect(malformedReport.checks.find(c => c.name === 'Format Check')?.reason).toContain('syntax validation failed');
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
