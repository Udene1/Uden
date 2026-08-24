import {
  QualityReport,
  QualityCheckResult,
  REFUSAL_PATTERNS,
  REPETITION_NGRAM_SIZE,
  MAX_REPETITION_COUNT,
  MIN_OUTPUT_LENGTH,
  QUALITY_THRESHOLD
} from '@ai-work-partner/shared';

/**
 * Slide a window of size N over a token list to count duplicate sequences.
 */
function findMaxNgramRepetition(tokens: string[], n: number): { count: number; ngram: string } {
  if (tokens.length < n) return { count: 0, ngram: '' };

  const counts = new Map<string, number>();
  let maxCount = 0;
  let topNgram = '';

  for (let i = 0; i <= tokens.length - n; i++) {
    const ngram = tokens.slice(i, i + n).join(' ').toLowerCase();
    const count = (counts.get(ngram) || 0) + 1;
    counts.set(ngram, count);
    if (count > maxCount) {
      maxCount = count;
      topNgram = ngram;
    }
  }

  return { count: maxCount, ngram: topNgram };
}

export function checkQuality(output: string, expectedFormat: string, prompt: string): QualityReport {
  const checks: QualityCheckResult[] = [];
  let shouldEscalate = false;
  let overallScore = 100;

  const raw = output || '';
  const trimmed = raw.trim();

  // ─────────────────────────────────────────────
  // 1. Empty / Minimal Output Check
  // ─────────────────────────────────────────────
  const isMinimal = trimmed.length < MIN_OUTPUT_LENGTH;
  checks.push({
    name: 'Empty/Minimal Check',
    passed: !isMinimal,
    score: isMinimal ? 0 : 100,
    severity: 'error',
    reason: isMinimal
      ? `Output is empty or below minimum threshold (${trimmed.length}/${MIN_OUTPUT_LENGTH} chars)`
      : 'Output length satisfies minimum threshold'
  });
  if (isMinimal) {
    shouldEscalate = true;
    overallScore = 0;
  }

  // ─────────────────────────────────────────────
  // 2. Refusal Pattern Detection
  // ─────────────────────────────────────────────
  let refusalFound = false;
  let refusalReason = 'No refusal detected';
  for (const pattern of REFUSAL_PATTERNS) {
    if (pattern.test(trimmed)) {
      refusalFound = true;
      refusalReason = `Matched AI refusal pattern: ${pattern.source}`;
      break;
    }
  }
  checks.push({
    name: 'Refusal Check',
    passed: !refusalFound,
    score: refusalFound ? 0 : 100,
    severity: 'error',
    reason: refusalReason
  });
  if (refusalFound) {
    shouldEscalate = true;
    overallScore = Math.min(overallScore, 20);
  }

  // ─────────────────────────────────────────────
  // 3. Truncation & Fence Integrity Check
  // ─────────────────────────────────────────────
  const codeFences = (raw.match(/```/g) || []).length;
  const hasUnclosedFence = codeFences % 2 !== 0;
  const endsAbruptly = /(?:\.\.\.|[a-zA-Z0-9],\s*$|\b(?:and|the|with|because|that|in|to|of)\s*$)/i.test(trimmed);
  const isTruncated = hasUnclosedFence || (trimmed.length > 20 && endsAbruptly);

  let truncationReason = 'Output completed naturally with closed fences and punctuation';
  if (hasUnclosedFence) {
    truncationReason = 'Output contains an unclosed code block fence (truncated markdown)';
  } else if (endsAbruptly) {
    truncationReason = 'Output ends abruptly mid-sentence or with trailing conjunction';
  }

  checks.push({
    name: 'Truncation Check',
    passed: !isTruncated,
    score: isTruncated ? 30 : 100,
    severity: 'error',
    reason: truncationReason
  });
  if (isTruncated) {
    shouldEscalate = true;
    overallScore = Math.max(0, overallScore - 40);
  }

  // ─────────────────────────────────────────────
  // 4. N-Gram & Word Repetition Check
  // ─────────────────────────────────────────────
  const words = trimmed.split(/\s+/).filter(Boolean);
  const { count: maxNgramCount, ngram } = findMaxNgramRepetition(words, REPETITION_NGRAM_SIZE);
  const isNgramRepetitive = maxNgramCount > MAX_REPETITION_COUNT;

  // Also calculate unique word ratio for general diversity
  const uniqueRatio = words.length > 40 ? new Set(words.map(w => w.toLowerCase())).size / words.length : 1;
  const isVocabularyDegraded = words.length > 40 && uniqueRatio < 0.20;

  const repetitionFailed = isNgramRepetitive || isVocabularyDegraded;
  let repetitionReason = 'Vocabulary diversity is healthy and non-repetitive';
  if (isNgramRepetitive) {
    repetitionReason = `Detected repetitive phrase loop (${maxNgramCount}x repeats of "${ngram}")`;
  } else if (isVocabularyDegraded) {
    repetitionReason = `Abnormally low vocabulary diversity (${Math.round(uniqueRatio * 100)}% unique words)`;
  }

  checks.push({
    name: 'Repetition Check',
    passed: !repetitionFailed,
    score: repetitionFailed ? 25 : 100,
    severity: 'error',
    reason: repetitionReason
  });
  if (repetitionFailed) {
    shouldEscalate = true;
    overallScore = Math.max(0, overallScore - 40);
  }

  // ─────────────────────────────────────────────
  // 5. Format & Syntax Validation
  // ─────────────────────────────────────────────
  let formatPassed = true;
  let formatReason = `Output satisfies format requirement (${expectedFormat})`;
  let formatScore = 100;

  if (expectedFormat === 'json') {
    // Check if JSON exists anywhere in the response
    const jsonMatch = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) {
      formatPassed = false;
      formatReason = 'Expected JSON structure, but no brackets or JSON objects were found';
      formatScore = 20;
    } else {
      try {
        JSON.parse(jsonMatch[0]);
      } catch {
        formatPassed = false;
        formatReason = 'Found JSON-like block, but syntax validation failed (malformed JSON)';
        formatScore = 40;
      }
    }
  } else if (expectedFormat === 'code') {
    const hasCodeBlock = codeFences >= 2;
    if (!hasCodeBlock) {
      formatPassed = false;
      formatReason = 'Expected code output with markdown code blocks (```), none found';
      formatScore = 40;
    }
  } else if (expectedFormat === 'html') {
    const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(trimmed);
    if (!hasHtmlTags) {
      formatPassed = false;
      formatReason = 'Expected HTML output with structured tags, none found';
      formatScore = 40;
    }
  }

  checks.push({
    name: 'Format Check',
    passed: formatPassed,
    score: formatScore,
    severity: formatScore <= 30 ? 'error' : 'warning',
    reason: formatReason
  });
  if (!formatPassed) {
    overallScore = Math.max(0, overallScore - (100 - formatScore) * 0.4);
    if (formatScore <= 30) shouldEscalate = true;
  }

  // ─────────────────────────────────────────────
  // 6. Completeness & Structural Adequacy
  // ─────────────────────────────────────────────
  const isTooBrief = (expectedFormat === 'code' || expectedFormat === 'markdown') && trimmed.length < 50;
  checks.push({
    name: 'Length Adequacy',
    passed: !isTooBrief,
    score: isTooBrief ? 50 : 100,
    severity: 'warning',
    reason: isTooBrief
      ? 'Output is unusually brief for the requested task domain'
      : 'Output length and structural depth are adequate'
  });
  if (isTooBrief) {
    overallScore = Math.max(0, overallScore - 20);
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(overallScore)));
  if (finalScore < QUALITY_THRESHOLD) {
    shouldEscalate = true;
  }

  const failedCheck = checks.find(c => !c.passed);

  return {
    overallScore: finalScore,
    passed: finalScore >= QUALITY_THRESHOLD && !checks.some(c => c.severity === 'error' && !c.passed),
    checks,
    shouldEscalate,
    escalationReason: shouldEscalate
      ? (failedCheck?.reason || `Quality score (${finalScore}) is below threshold (${QUALITY_THRESHOLD})`)
      : undefined
  };
}
