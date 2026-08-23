import { QualityReport, QualityCheckResult, REFUSAL_PATTERNS } from '@ai-work-partner/shared';

export function checkQuality(output: string, expectedFormat: string, prompt: string): QualityReport {
  const checks: QualityCheckResult[] = [];
  let shouldEscalate = false;
  let overallScore = 100;

  // 1. Empty/Minimal Check
  const trimmed = output ? output.trim() : '';
  const isMinimal = trimmed.length < 20;
  checks.push({
    name: 'Empty/Minimal Check',
    passed: !isMinimal,
    score: isMinimal ? 0 : 100,
    severity: 'error',
    reason: isMinimal ? 'Output is empty or too short (< 20 chars)' : 'Length is sufficient'
  });
  if (isMinimal) {
    shouldEscalate = true;
    overallScore -= 100;
  }

  // 2. Refusal Check
  let refusalFound = false;
  let refusalReason = '';
  for (const pattern of REFUSAL_PATTERNS) {
    if (pattern.test(trimmed)) {
      refusalFound = true;
      refusalReason = `Matched refusal pattern: ${pattern.source}`;
      break;
    }
  }
  checks.push({
    name: 'Refusal Check',
    passed: !refusalFound,
    score: refusalFound ? 0 : 100,
    severity: 'error',
    reason: refusalFound ? refusalReason : 'No refusal detected'
  });
  if (refusalFound) {
    shouldEscalate = true;
    overallScore -= 80;
  }

  // 3. Truncation Check
  const codeFences = (output.match(/```/g) || []).length;
  const isTruncated = codeFences % 2 !== 0 || output.endsWith('...') || output.endsWith('and');
  checks.push({
    name: 'Truncation Check',
    passed: !isTruncated,
    score: isTruncated ? 30 : 100,
    severity: 'error',
    reason: isTruncated ? 'Output appears truncated (unclosed code fence or abrupt ending)' : 'Output completed naturally'
  });
  if (isTruncated) {
    shouldEscalate = true;
    overallScore -= 50;
  }

  // 4. Excessive Repetition Check
  const words = output.split(/\s+/);
  const uniqueRatio = words.length > 30 ? new Set(words).size / words.length : 1;
  const isRepetitive = uniqueRatio < 0.25;
  checks.push({
    name: 'Repetition Check',
    passed: !isRepetitive,
    score: isRepetitive ? 20 : 100,
    severity: 'error',
    reason: isRepetitive ? 'Excessive word repetition detected' : 'Word diversity is healthy'
  });
  if (isRepetitive) {
    shouldEscalate = true;
    overallScore -= 40;
  }

  // 5. Format Mismatch Check
  let formatPassed = true;
  let formatReason = 'Format matches requirement';
  if (expectedFormat === 'json' && (!output.includes('{') || !output.includes('}'))) {
    formatPassed = false;
    formatReason = 'Expected JSON structure but missing brackets';
  } else if (expectedFormat === 'code' && !output.includes('```')) {
    formatPassed = false;
    formatReason = 'Expected code blocks but none found';
  }
  checks.push({
    name: 'Format Check',
    passed: formatPassed,
    score: formatPassed ? 100 : 40,
    severity: 'warning',
    reason: formatReason
  });
  if (!formatPassed) overallScore -= 30;

  // 6. Length Adequacy Check
  const isShort = expectedFormat === 'code' && output.length < 50;
  checks.push({
    name: 'Length Adequacy',
    passed: !isShort,
    score: isShort ? 50 : 100,
    severity: 'warning',
    reason: isShort ? 'Output length is surprisingly short for the requested task' : 'Output length adequate'
  });
  if (isShort) overallScore -= 20;

  const finalScore = Math.max(0, Math.min(100, overallScore));
  if (finalScore < 60) {
    shouldEscalate = true;
  }

  const failedCheck = checks.find(c => !c.passed);

  return {
    overallScore: finalScore,
    passed: finalScore >= 60 && !checks.some(c => c.severity === 'error' && !c.passed),
    checks,
    shouldEscalate,
    escalationReason: shouldEscalate ? failedCheck?.reason || 'Quality score below threshold' : undefined
  };
}
