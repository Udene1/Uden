import { describe, expect, it } from 'vitest';
import { canRepair } from './graph-repair';
import type { TaskNode } from '@ai-work-partner/shared';

const node = (repairAttempts = 0): TaskNode => ({
  id: 'execute', title: 'Run project tests', prompt: 'npm test', domain: 'code', complexity: 1,
  expectedFormat: 'text', recommendedTier: 1, dependencies: [], contextFrom: [], attemptedModels: [],
  status: 'failed', kind: 'project-tool', tool: 'execute', repairAttempts,
});

describe('bounded graph repair', () => {
  it('allows project execute repair below the cap', () => expect(canRepair(node(2))).toBe(true));
  it('stops repair at the hard cap', () => expect(canRepair(node(3))).toBe(false));
  it('does not repair non-execute nodes', () => expect(canRepair({ ...node(0), tool: 'patch' })).toBe(false));
  it('does not repair successful nodes', () => expect(canRepair({ ...node(0), status: 'completed' })).toBe(false));
});

describe('repair proposal contract', () => {
  it('requires generated repairs to be machine-readable patch documents', () => {
    expect(canRepair(node(0))).toBe(true);
  });
});
