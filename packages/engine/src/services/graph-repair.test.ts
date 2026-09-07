import { describe, expect, it } from 'vitest';
import { canRepair, parseRepairPatchDocument } from './graph-repair';
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

describe('repair patch contract', () => {
  it('accepts strict JSON', () => {
    expect(parseRepairPatchDocument('{"files":[{"path":"src/a.ts","content":"export const a = 1;"}]}')).toEqual([
      { path: 'src/a.ts', content: 'export const a = 1;' },
    ]);
  });

  it('accepts a JSON fenced response', () => {
    expect(parseRepairPatchDocument('```json\n{"files":[{"path":"src/a.ts","content":"ok"}]}\n```')).toEqual([
      { path: 'src/a.ts', content: 'ok' },
    ]);
  });

  it('rejects malformed model output', () => {
    expect(() => parseRepairPatchDocument('not json')).toThrow('valid patch document');
  });

  it('rejects duplicate files', () => {
    expect(() => parseRepairPatchDocument('{"files":[{"path":"a","content":"1"},{"path":"a","content":"2"}]}')).toThrow('duplicate paths');
  });

  it('rejects empty patches', () => {
    expect(() => parseRepairPatchDocument('{"files":[]}')).toThrow('invalid number of files');
  });
});
