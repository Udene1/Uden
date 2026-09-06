import type {
  ModelTier,
  OutputFormat,
  QualityPreference,
  TaskDomain,
} from './types';

export type TaskNodeStatus =
  | 'pending'
  | 'ready'
  | 'running'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'awaiting-approval';

export type ApprovalState = 'not-required' | 'pending' | 'approved' | 'rejected';

export interface TaskNode {
  id: string;
  title: string;
  prompt: string;
  domain: TaskDomain;
  complexity: number;
  expectedFormat: OutputFormat;
  recommendedTier: ModelTier;
  dependencies: string[];
  status: TaskNodeStatus;
  contextFrom: string[];
  attemptedModels: string[];
  selectedModel?: string;
  output?: string;
  qualityScore?: number;
  costCents?: number;
  tokensIn?: number;
  tokensOut?: number;
  error?: string;
  approvalRequired?: boolean;
  approvalState?: ApprovalState;
  approvalReason?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface TaskGraph {
  id: string;
  rootTaskId: string;
  goal: string;
  nodes: TaskNode[];
  createdAt: string;
  completedAt?: string;
}

export interface TaskGraphPlan {
  goal: string;
  nodes: Array<Pick<
    TaskNode,
    | 'id'
    | 'title'
    | 'prompt'
    | 'domain'
    | 'complexity'
    | 'expectedFormat'
    | 'recommendedTier'
    | 'dependencies'
    | 'contextFrom'
  >>;
}

export interface NodeRoutingContext {
  qualityPreference: QualityPreference;
  budgetLeftCents: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  latencyPreference?: 'low' | 'balanced' | 'unbounded';
}

export interface NodeRoutingDecision {
  nodeId: string;
  primaryModel: string;
  fallbackChain: string[];
  estimatedCostCents: number;
  reasoning: string;
}
