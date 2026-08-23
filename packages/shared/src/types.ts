// ─────────────────────────────────────────────
// Core Domain Types for AI Work Partner
// ─────────────────────────────────────────────

/** Work modes for task execution */
export type WorkMode = 'permissionless' | 'permission-based';

/** Quality preference tiers for routing decisions */
export type QualityPreference = 'cost-optimized' | 'balanced' | 'quality-first';

/** Task processing status lifecycle */
export type TaskStatus =
  | 'pending'
  | 'classifying'
  | 'routing'
  | 'processing'
  | 'quality-check'
  | 'escalating'
  | 'completed'
  | 'failed'
  | 'awaiting-approval'
  | 'approved'
  | 'rejected';

/** AI provider identifiers */
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'deepseek';

/** Model tier classification */
export type ModelTier = 1 | 2 | 3; // 1=Budget, 2=Mid, 3=Premium

/** Task domain classification */
export type TaskDomain =
  | 'writing'
  | 'code'
  | 'analysis'
  | 'legal'
  | 'email'
  | 'planning'
  | 'research'
  | 'creative'
  | 'data'
  | 'general';

/** Output format expectations */
export type OutputFormat = 'text' | 'markdown' | 'json' | 'code' | 'structured-document' | 'html';

/** Quality check severity levels */
export type CheckSeverity = 'warning' | 'error';

// ─────────────────────────────────────────────
// Tenant
// ─────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  email: string;
  apiKeyHash: string;
  qualityPreference: QualityPreference;
  monthlyBudgetCents: number;
  defaultMode: WorkMode;
  /** Whether the tenant provides their own AI API keys */
  bringOwnKeys: boolean;
  /** Encrypted tenant API keys (when bringOwnKeys = true) */
  providerKeys?: ProviderKeys;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderKeys {
  openai?: string;
  anthropic?: string;
  google?: string;
  deepseek?: string;
}

// ─────────────────────────────────────────────
// Project / Workspace
// ─────────────────────────────────────────────

export interface Project {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  /** Accumulated context for project continuity */
  context?: string;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
// Task
// ─────────────────────────────────────────────

export interface Task {
  id: string;
  tenantId: string;
  projectId?: string;
  prompt: string;
  mode: WorkMode;
  status: TaskStatus;
  /** Classification results */
  classifiedTier?: ModelTier;
  classifiedDomain?: TaskDomain;
  classifiedComplexity?: number;
  expectedFormat?: OutputFormat;
  /** Execution results */
  modelUsed?: string;
  output?: string;
  /** Proposal for permission-based mode */
  proposal?: TaskProposal;
  qualityScore?: number;
  totalCostCents?: number;
  tokensIn?: number;
  tokensOut?: number;
  escalationCount: number;
  createdAt: string;
  completedAt?: string;
}

export interface TaskProposal {
  suggestedModel: string;
  estimatedCostCents: number;
  actionDescription: string;
  reasoning: string;
}

// ─────────────────────────────────────────────
// Task Classification
// ─────────────────────────────────────────────

export interface TaskClassification {
  complexity: number;      // 1–10
  domain: TaskDomain;
  recommendedTier: ModelTier;
  expectedFormat: OutputFormat;
  estimatedOutputTokens: number;
  keywords: string[];
  reasoning: string;
}

// ─────────────────────────────────────────────
// Routing
// ─────────────────────────────────────────────

export interface RoutingPlan {
  primaryModel: string;
  fallbackChain: string[];
  estimatedCostCents: number;
  reasoning: string;
}

// ─────────────────────────────────────────────
// Quality
// ─────────────────────────────────────────────

export interface QualityCheckResult {
  name: string;
  passed: boolean;
  score: number;          // 0–100
  severity: CheckSeverity;
  reason: string;
}

export interface QualityReport {
  overallScore: number;   // 0–100
  passed: boolean;
  checks: QualityCheckResult[];
  shouldEscalate: boolean;
  escalationReason?: string;
}

// ─────────────────────────────────────────────
// Escalation
// ─────────────────────────────────────────────

export interface EscalationLog {
  id: string;
  taskId: string;
  fromModel: string;
  toModel: string;
  reason: string;
  qualityScore: number;
  attemptNumber: number;
  createdAt: string;
}

// ─────────────────────────────────────────────
// Usage & Cost
// ─────────────────────────────────────────────

export interface UsageRecord {
  id: string;
  tenantId: string;
  taskId?: string;
  model: string;
  provider: AIProvider;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  createdAt: string;
}

export interface UsageSummary {
  totalCostCents: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  escalationCount: number;
  escalationRate: number;
  averageQualityScore: number;
  costByModel: Record<string, number>;
  costByProvider: Record<string, number>;
  savingsEstimateCents: number;
  budgetUsedPercent: number;
}

export interface DailyUsage {
  date: string;
  costCents: number;
  taskCount: number;
  tokensIn: number;
  tokensOut: number;
}

// ─────────────────────────────────────────────
// Model Configuration
// ─────────────────────────────────────────────

export interface ModelConfig {
  id: string;
  provider: AIProvider;
  displayName: string;
  tier: ModelTier;
  /** Cost per million input tokens in cents */
  inputCostPerMillion: number;
  /** Cost per million output tokens in cents */
  outputCostPerMillion: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  /** What this model excels at */
  strengths: TaskDomain[];
  /** Whether this model supports streaming */
  supportsStreaming: boolean;
  /** Whether this model is currently enabled */
  enabled: boolean;
}

// ─────────────────────────────────────────────
// Provider Adapter Interface
// ─────────────────────────────────────────────

export interface ProviderRequest {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  systemPrompt?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ProviderResponse {
  content: string;
  model: string;
  provider: AIProvider;
  tokensIn: number;
  tokensOut: number;
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  latencyMs: number;
}

// ─────────────────────────────────────────────
// API Request / Response DTOs
// ─────────────────────────────────────────────

export interface CreateTaskRequest {
  prompt: string;
  projectId?: string;
  mode?: WorkMode;
}

export interface CreateTenantRequest {
  name: string;
  email: string;
  qualityPreference?: QualityPreference;
  monthlyBudgetCents?: number;
  defaultMode?: WorkMode;
}

export interface UpdateTenantRequest {
  name?: string;
  qualityPreference?: QualityPreference;
  monthlyBudgetCents?: number;
  defaultMode?: WorkMode;
  bringOwnKeys?: boolean;
  providerKeys?: ProviderKeys;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}
