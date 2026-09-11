import type { ExecutionRuntimeCapability, ExecutionRuntimeKind, TaskNode } from '@ai-work-partner/shared';

const HIGH_RISK_CAPABILITIES = new Set<ExecutionRuntimeCapability>(['filesystem.write','git.write','network.outbound']);
const WRITE_CAPABILITIES = new Set<ExecutionRuntimeCapability>(['filesystem.write','git.write']);

export interface CapabilityPolicy { capability?: ExecutionRuntimeCapability; preferredRuntimeKind?: ExecutionRuntimeKind; riskLevel: 'low'|'medium'|'high'|'critical'; approvalRequired: boolean; reason?: string; }

export function deriveCapabilityPolicy(node: TaskNode): CapabilityPolicy {
  const capability = node.runtimeCapability;
  if (!capability) return { riskLevel: node.kind === 'project-tool' && node.tool === 'execute' ? 'high' : 'low', approvalRequired: node.approvalRequired === true };
  let riskLevel: CapabilityPolicy['riskLevel'] = 'medium';
  if (WRITE_CAPABILITIES.has(capability)) riskLevel = 'high';
  if (capability === 'network.outbound' && node.preferredRuntimeKind === 'desktop_local') riskLevel = 'critical';
  const approvalRequired = node.approvalRequired === true || HIGH_RISK_CAPABILITIES.has(capability);
  return { capability, preferredRuntimeKind: node.preferredRuntimeKind, riskLevel, approvalRequired, reason: approvalRequired ? `Capability ${capability} crosses an external side-effect boundary` : undefined };
}

export function assertCapabilityPolicy(node: TaskNode): void {
  const policy = deriveCapabilityPolicy(node);
  if (policy.capability && node.kind !== 'project-tool') throw new Error(`Runtime capability ${policy.capability} requires a project-tool node`);
  if (policy.capability === 'interactive.process' && node.preferredRuntimeKind === 'cloud_automation') throw new Error('interactive.process cannot target cloud_automation');
  if (policy.capability === 'git.write' && !node.preferredRuntimeKind) return;
}
