import { describe, expect, it } from 'vitest';
import type { TaskGraph, TaskGraphPlan, TaskNode } from '@ai-work-partner/shared';
import { buildGraphNodePrompt, validateTaskGraphPlan } from './graph-executor';

const node = (id: string, dependencies: string[] = [], contextFrom: string[] = []): TaskGraphPlan['nodes'][number] => ({
  id,
  title: id,
  prompt: `Do ${id}`,
  domain: 'general',
  complexity: 3,
  expectedFormat: 'markdown',
  recommendedTier: 1,
  dependencies,
  contextFrom,
});

describe('validateTaskGraphPlan', () => {
  it('accepts a valid dependency graph', () => {
    expect(() => validateTaskGraphPlan({ goal: 'goal', nodes: [node('research'), node('write', ['research'], ['research'])] })).not.toThrow();
  });

  it('rejects duplicate node ids', () => {
    expect(() => validateTaskGraphPlan({ goal: 'goal', nodes: [node('a'), node('a')] })).toThrow(/duplicate node id/);
  });

  it('rejects missing dependencies', () => {
    expect(() => validateTaskGraphPlan({ goal: 'goal', nodes: [node('a', ['missing'])] })).toThrow(/missing node/);
  });

  it('rejects dependency cycles', () => {
    expect(() => validateTaskGraphPlan({
      goal: 'goal',
      nodes: [node('a', ['b']), node('b', ['a'])],
    })).toThrow(/dependency cycle/);
  });
});

describe('buildGraphNodePrompt', () => {
  it('includes only explicitly requested upstream context', () => {
    const upstream: TaskNode = {
      ...node('research'),
      status: 'completed',
      attemptedModels: ['gpt-4o-mini'],
      output: 'Evidence found',
      qualityScore: 92,
    };
    const unrelated: TaskNode = {
      ...node('unrelated'),
      status: 'completed',
      attemptedModels: ['gpt-4o-mini'],
      output: 'Do not include me',
      qualityScore: 90,
    };
    const target: TaskNode = {
      ...node('write', ['research'], ['research']),
      status: 'pending',
      attemptedModels: [],
    };
    const graph: TaskGraph = {
      id: 'graph-1',
      rootTaskId: 'task-1',
      goal: 'goal',
      nodes: [upstream, unrelated, target],
      createdAt: '2026-09-06T00:00:00.000Z',
    };

    const prompt = buildGraphNodePrompt(target, graph);
    expect(prompt).toContain('Evidence found');
    expect(prompt).toContain('Quality score: 92');
    expect(prompt).not.toContain('Do not include me');
  });
});
