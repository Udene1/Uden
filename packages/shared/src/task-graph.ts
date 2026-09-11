import type { ModelTier, OutputFormat, QualityPreference, TaskDomain } from './types';
import type { ExecutionRuntimeCapability, ExecutionRuntimeKind } from './execution-runtime';

export type TaskNodeStatus = 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'blocked' | 'awaiting-approval' | 'awaiting-runtime';
export type ApprovalState = 'not-required' | 'pending' | 'approved' | 'rejected';
export type TaskNodeKind = 'model' | 'project-tool';
export interface TaskNodeVerification { passed: boolean; reason: string; checkedAt: string; }
export interface TaskNode {
  id: string; title: string; prompt: string; domain: TaskDomain; complexity: number; expectedFormat: OutputFormat;
  recommendedTier: ModelTier; dependencies: string[]; status: TaskNodeStatus; contextFrom: string[]; attemptedModels: string[];
  kind?: TaskNodeKind; tool?: 'tree' | 'read' | 'search' | 'diff' | 'patch' | 'execute'; toolInput?: Record<string, unknown>;
  runtimeCapability?: ExecutionRuntimeCapability; preferredRuntimeKind?: ExecutionRuntimeKind;
  selectedModel?: string; output?: string; qualityScore?: number; costCents?: number; tokensIn?: number; tokensOut?: number; error?: string;
  approvalRequired?: boolean; approvalState?: ApprovalState; approvalReason?: string; approvedBy?: string; approvedAt?: string;
  runtimeJobId?: string; verification?: TaskNodeVerification; repairAttempts?: number; repairError?: string;
}
export interface TaskGraph { id: string; rootTaskId: string; goal: string; projectId?: string; executionPrincipal?: string; nodes: TaskNode[]; createdAt: string; completedAt?: string; }
export interface TaskGraphPlan {
  goal: string;
  projectId?: string;
  nodes: Array<Pick<TaskNode, 'id' | 'title' | 'prompt' | 'domain' | 'complexity' | 'expectedFormat' | 'recommendedTier' | 'dependencies' | 'contextFrom'> & Partial<Pick<TaskNode, 'kind' | 'tool' | 'toolInput' | 'approvalRequired' | 'approvalReason' | 'runtimeCapability' | 'preferredRuntimeKind'>>>;
}
export interface NodeRoutingContext { qualityPreference: QualityPreference; budgetLeftCents: number; riskLevel?: 'low' | 'medium' | 'high' | 'critical'; latencyPreference?: 'low' | 'balanced' | 'unbounded'; }
export interface NodeRoutingDecision { nodeId: string; primaryModel: string; fallbackChain: string[]; estimatedCostCents: number; reasoning: string; }
export interface TaskNodeRuntimeIntent { capability?: ExecutionRuntimeCapability; preferredKind?: ExecutionRuntimeKind; command?: string; args?: readonly string[]; workingDirectory?: string; }
export function getTaskNodeRuntimeIntent(node: TaskNode): TaskNodeRuntimeIntent { const input=node.toolInput??{}; return { capability:node.runtimeCapability, preferredKind:node.preferredRuntimeKind, command:typeof input.command==='string'?input.command:undefined, args:Array.isArray(input.args)&&input.args.every(value=>typeof value==='string')?input.args as string[]:undefined, workingDirectory:typeof input.workingDirectory==='string'?input.workingDirectory:undefined }; }
export function requiresRuntime(node: TaskNode): boolean { return Boolean(node.runtimeCapability); }
