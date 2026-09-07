import type { TaskGraph, TaskNode, TaskNodeVerification } from '@ai-work-partner/shared';
import type { RuntimeResult } from './project-runtime';

export const MAX_REPAIR_ATTEMPTS = 3;

export interface VerificationResult extends TaskNodeVerification {
  artifact?: string;
}

export function verifyRuntimeResult(result: RuntimeResult, successCriteria?: string): VerificationResult {
  if (result.status === 'queued' || result.status === 'running') {
    return { passed: false, reason: 'Runtime execution is not terminal', checkedAt: new Date().toISOString() };
  }
  if (result.status === 'failed') {
    return { passed: false, reason: result.output || `Runtime execution failed with exit code ${result.exitCode ?? 'unknown'}`, checkedAt: new Date().toISOString() };
  }
  if (result.exitCode !== undefined && result.exitCode !== 0) {
    return { passed: false, reason: `Runtime exited with code ${result.exitCode}`, checkedAt: new Date().toISOString() };
  }
  if (successCriteria && !result.output?.trim()) {
    return { passed: false, reason: `Success criteria could not be verified: ${successCriteria}`, checkedAt: new Date().toISOString() };
  }
  return { passed: true, reason: successCriteria ? `Runtime completed; success criteria recorded: ${successCriteria}` : 'Runtime completed with exit code 0', checkedAt: new Date().toISOString(), artifact: result.output };
}

export function shouldRepairNode(node: TaskNode): boolean {
  return node.status === 'failed' && (node.repairAttempts || 0) < MAX_REPAIR_ATTEMPTS;
}

export function nextRepairAttempt(node: TaskNode): number {
  return (node.repairAttempts || 0) + 1;
}

export function buildRepairContext(graph: TaskGraph, node: TaskNode): string {
  const dependencyOutput = node.dependencies
    .map(id => graph.nodes.find(candidate => candidate.id === id))
    .filter((candidate): candidate is TaskNode => Boolean(candidate?.output))
    .map(candidate => `Dependency ${candidate.id}:\n${candidate.output}`)
    .join('\n\n');
  return [
    `Node: ${node.id}`,
    `Goal: ${graph.goal}`,
    `Prompt: ${node.prompt}`,
    `Failure: ${node.error || 'unknown'}`,
    `Verification: ${node.verification?.reason || 'not available'}`,
    dependencyOutput,
    'Repair must address the observed failure only; do not invent APIs, credentials, test results, or successful outcomes.'
  ].filter(Boolean).join('\n\n');
}
