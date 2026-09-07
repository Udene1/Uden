import { describe, expect, it } from 'vitest';
import type { TaskNode } from '@ai-work-partner/shared';
import { canRepair, MAX_GRAPH_REPAIR_ATTEMPTS, parseRepairPatchDocument } from './graph-repair';
import { verifyRuntimeResult } from './graph-verification';

const executeNode = (repairAttempts = 0): TaskNode => ({
  id: 'execute', title: 'Run tests', prompt: 'npm test', domain: 'code', complexity: 1,
  expectedFormat: 'text', recommendedTier: 1, dependencies: [], contextFrom: [],
  status: 'failed', attemptedModels: [], kind: 'project-tool', tool: 'execute',
  toolInput: { command: 'npm test', successCriteria: 'at least 3 results' }, repairAttempts,
});

describe('graph repair lifecycle invariants', () => {
  it('honors semantic success criteria before a repair is considered necessary', () => {
    expect(verifyRuntimeResult({ jobId: 'job', status: 'succeeded', exitCode: 0, output: 'a\nb\nc' }, 'at least 3 results').passed).toBe(true);
    expect(verifyRuntimeResult({ jobId: 'job', status: 'succeeded', exitCode: 0, output: 'a\nb' }, 'at least 3 results').passed).toBe(false);
  });

  it('allows repair only below the hard three-attempt ceiling', () => {
    expect(MAX_GRAPH_REPAIR_ATTEMPTS).toBe(3);
    expect(canRepair(executeNode(0))).toBe(true);
    expect(canRepair(executeNode(2))).toBe(true);
    expect(canRepair(executeNode(3))).toBe(false);
    expect(canRepair({ ...executeNode(2), tool: 'patch' })).toBe(false);
  });

  it('rejects malformed or oversized repair documents', () => {
    expect(() => parseRepairPatchDocument('{"files":[]}')).toThrow();
    expect(() => parseRepairPatchDocument('{"files":[{"path":"a.ts","content":"x"},{"path":"a.ts","content":"y"}]}')).toThrow(/duplicate/);
    expect(parseRepairPatchDocument('```json\n{"files":[{"path":"a.ts","content":"fixed"}]}\n```')).toEqual([{ path: 'a.ts', content: 'fixed' }]);
  });
});
