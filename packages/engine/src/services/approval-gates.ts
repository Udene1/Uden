import type { TaskGraphPlan, TaskNode } from '@ai-work-partner/shared';

export interface ApprovalRequirement {
  required: boolean;
  reasons: string[];
  nodes: Array<{ id: string; title: string; reason: string }>;
}

export function nodeApprovalReason(node: Pick<TaskNode, 'domain' | 'complexity' | 'expectedFormat'>): string | null {
  if (node.domain === 'legal') return 'Legal-domain work requires human review before model execution.';
  if (node.complexity >= 9) return 'Critical-complexity work requires human review before execution.';
  if (node.complexity >= 8 && node.expectedFormat === 'code') return 'High-complexity code execution requires human review before execution.';
  if (node.complexity >= 8 && node.domain === 'data') return 'High-complexity data work requires human review before execution.';
  return null;
}

export function getApprovalRequirement(plan: TaskGraphPlan): ApprovalRequirement {
  const nodes = plan.nodes.flatMap((node) => {
    const reason = nodeApprovalReason(node);
    return reason ? [{ id: node.id, title: node.title, reason }] : [];
  });
  return { required: nodes.length > 0, reasons: nodes.map((node) => node.reason), nodes };
}
