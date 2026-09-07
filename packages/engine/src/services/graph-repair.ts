import type { HonoEnv } from '../types';
import type { TaskNode } from '@ai-work-partner/shared';
import { generateCode } from './code-generation';
import { previewProjectDiff } from './project-context';

export const MAX_GRAPH_REPAIR_ATTEMPTS = 3;

export interface RepairProposal {
  attempted: boolean;
  exhausted: boolean;
  instruction?: string;
  generated?: string;
  reason: string;
}

export function canRepair(node: TaskNode): boolean {
  return node.kind === 'project-tool' && node.tool === 'execute' && (node.repairAttempts || 0) < MAX_GRAPH_REPAIR_ATTEMPTS;
}

export async function buildRepairProposal(
  env: HonoEnv['Bindings'],
  tenantId: string,
  projectId: string,
  node: TaskNode,
): Promise<RepairProposal> {
  const attempts = node.repairAttempts || 0;
  if (attempts >= MAX_GRAPH_REPAIR_ATTEMPTS) return { attempted: false, exhausted: true, reason: 'Maximum repair attempts reached' };
  const failure = node.verification?.reason || node.error || 'Runtime verification failed';
  const instruction = [
    'Diagnose and repair the project so the failed execution objective can pass.',
    `Node: ${node.title}`,
    `Requested operation: ${node.prompt}`,
    `Failure: ${failure}`,
    `Repair attempt: ${attempts + 1} of ${MAX_GRAPH_REPAIR_ATTEMPTS}`,
    'Return only the concrete code changes required. Do not claim tests passed unless they were actually executed.',
  ].join('\n');
  const generated = await generateCode(env, tenantId, {
    instruction,
    projectId,
    language: 'auto-detect',
    framework: 'existing project',
    existingContext: `Execution output:\n${node.output || '(none)'}\n\nVerification:\n${failure}`,
  });
  return {
    attempted: true,
    exhausted: false,
    instruction,
    generated: typeof generated.result === 'string' ? generated.result : JSON.stringify(generated.result),
    reason: 'Repair proposal generated; it must pass the existing approval gate before mutation',
  };
}

export async function previewRepairDiff(env: HonoEnv['Bindings'], tenantId: string, projectId: string, path: string, content: string, expectedVersion?: number) {
  return previewProjectDiff(env, tenantId, projectId, path, content, expectedVersion);
}
