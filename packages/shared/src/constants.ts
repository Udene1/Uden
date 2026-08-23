// ─────────────────────────────────────────────
// System Constants & Configuration
// ─────────────────────────────────────────────

/** Maximum number of escalation attempts per task */
export const MAX_ESCALATION_ATTEMPTS = 3;

/** Quality score threshold below which escalation is triggered */
export const QUALITY_THRESHOLD = 60;

/** Minimum output length (characters) before "empty output" quality check fails */
export const MIN_OUTPUT_LENGTH = 20;

/** Maximum n-gram repetition count before "excessive repetition" check fails */
export const MAX_REPETITION_COUNT = 3;

/** N-gram size for repetition detection */
export const REPETITION_NGRAM_SIZE = 4;

/** Budget warning thresholds (as percentage) */
export const BUDGET_WARNING_THRESHOLD = 80;
export const BUDGET_CRITICAL_THRESHOLD = 95;
export const BUDGET_HARD_LIMIT = 100;

/** Default monthly budget in cents ($100) */
export const DEFAULT_MONTHLY_BUDGET_CENTS = 10000;

/** Default pagination */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Approximate tokens per word (for estimation) */
export const TOKENS_PER_WORD = 1.3;

/** Rate limiting defaults */
export const RATE_LIMIT_REQUESTS_PER_MINUTE = 60;
export const RATE_LIMIT_TASKS_PER_MINUTE = 20;

/** Refusal detection patterns */
export const REFUSAL_PATTERNS = [
  /^i('m| am) (sorry|unable|not able)/i,
  /^(unfortunately|i apologize|i cannot|i can't)/i,
  /as an ai (language )?model/i,
  /i('m| am) not (able|capable|designed) to/i,
  /i (don't|do not) have the ability/i,
  /violates (our|my) (safety|usage|content) policy/i,
  /i (can't|cannot|won't|will not) (help|assist|provide|generate|create) (with )?(that|this)/i,
  /^i'm afraid i can('t|not)/i,
];

/** Domain classification keywords */
export const DOMAIN_KEYWORDS: Record<string, string[]> = {
  legal: [
    'contract', 'agreement', 'clause', 'liability', 'indemnity', 'warranty',
    'terms', 'conditions', 'compliance', 'regulation', 'statute', 'legal',
    'attorney', 'litigation', 'arbitration', 'jurisdiction', 'nda',
    'non-disclosure', 'intellectual property', 'patent', 'trademark',
  ],
  code: [
    'function', 'class', 'api', 'endpoint', 'database', 'sql', 'javascript',
    'typescript', 'python', 'react', 'component', 'algorithm', 'debug',
    'refactor', 'implement', 'code', 'programming', 'software', 'deploy',
    'git', 'docker', 'kubernetes', 'microservice', 'backend', 'frontend',
  ],
  email: [
    'email', 'mail', 'subject line', 'follow-up', 'reach out', 'dear',
    'regards', 'sincerely', 'newsletter', 'outreach', 'cold email',
    'reply', 'respond', 'cc', 'bcc', 'attachment',
  ],
  analysis: [
    'analyze', 'analysis', 'compare', 'evaluate', 'assess', 'metrics',
    'data', 'trend', 'insight', 'report', 'summary', 'findings',
    'statistics', 'correlation', 'benchmark', 'kpi', 'performance',
  ],
  writing: [
    'write', 'draft', 'compose', 'document', 'article', 'blog', 'post',
    'essay', 'proposal', 'report', 'memo', 'letter', 'copy', 'content',
    'whitepaper', 'case study', 'press release', 'announcement',
  ],
  planning: [
    'plan', 'strategy', 'roadmap', 'timeline', 'milestone', 'objective',
    'goal', 'project plan', 'sprint', 'backlog', 'prioritize', 'scope',
    'budget', 'resource', 'schedule', 'deadline', 'gantt',
  ],
  research: [
    'research', 'investigate', 'explore', 'study', 'survey', 'literature',
    'review', 'findings', 'methodology', 'hypothesis', 'experiment',
    'market research', 'competitive analysis', 'due diligence',
  ],
  creative: [
    'creative', 'brainstorm', 'idea', 'concept', 'design', 'brand',
    'slogan', 'tagline', 'story', 'narrative', 'campaign', 'pitch',
    'vision', 'innovation', 'prototype', 'mockup',
  ],
  data: [
    'csv', 'json', 'xml', 'spreadsheet', 'table', 'chart', 'graph',
    'visualization', 'parse', 'transform', 'etl', 'pipeline', 'schema',
    'migration', 'import', 'export', 'query',
  ],
};

/** Task complexity indicators (add to complexity score) */
export const COMPLEXITY_INDICATORS = {
  /** Keywords that suggest higher complexity */
  highComplexity: [
    'comprehensive', 'detailed', 'thorough', 'in-depth', 'production-ready',
    'enterprise', 'scalable', 'multi-step', 'complex', 'advanced',
    'professional', 'publication-ready', 'executive', 'board-level',
  ],
  /** Keywords that suggest lower complexity */
  lowComplexity: [
    'simple', 'quick', 'brief', 'short', 'basic', 'summary', 'overview',
    'one-liner', 'snippet', 'fix', 'tweak', 'minor', 'small',
  ],
  /** Output structure requirements that add complexity */
  structuredOutput: [
    'table', 'list', 'bullet points', 'numbered', 'sections', 'headers',
    'format as', 'structured', 'template', 'outline', 'framework',
  ],
};
