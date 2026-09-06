import { describe, expect, it } from 'vitest';
import { createTaskGraph, decomposeTask, getReadyNodes } from './task-graph';
import { routeGraphNode } from './graph-router';

const compoundPrompt =
  'Research the market, define the requirements and architecture, design the database schema, implement the backend API, test it, and perform a security review.';

describe('task graph decomposition', () => {
  it('keeps a simple request as one executable node', () => {
    const plan = decomposeTask('Summarize this document in five bullets.');
    expect(plan.nodes).toHaveLength(1);
    expect(plan.nodes[0].id).toBe('task');
    expect(plan.nodes[0].dependencies).toEqual([]);
  });

  it('creates dependent work units for a compound request', () => {
    const plan = decomposeTask(compoundPrompt);
    const ids = plan.nodes.map((node) => node.id);

    expect(ids).toEqual(['research', 'planning', 'data', 'implementation', 'testing', 'review']);
    expect(plan.nodes.find((node) => node.id === 'planning')?.dependencies).toEqual(['research']);
    expect(plan.nodes.find((node) => node.id === 'implementation')?.dependencies).toEqual(['planning', 'data']);
    expect(plan.nodes.find((node) => node.id === 'testing')?.dependencies).toEqual([
      'research',
      'planning',
      'data',
      'implementation',
    ]);
  });

  it('only exposes root nodes as ready initially', () => {
    const graph = createTaskGraph('root', decomposeTask(compoundPrompt), '2026-09-06T00:00:00.000Z');
    expect(getReadyNodes(graph).map((node) => node.id)).toEqual(['research']);
  });

  it('routes each node independently', () => {
    const graph = createTaskGraph('root', decomposeTask(compoundPrompt));
    const research = graph.nodes.find((node) => node.id === 'research')!;
    const decision = routeGraphNode(research, {
      qualityPreference: 'balanced',
      budgetLeftCents: 1000,
      riskLevel: 'low',
    });

    expect(decision.nodeId).toBe('research');
    expect(decision.primaryModel).toBeTruthy();
    expect(decision.fallbackChain.length).toBeGreaterThan(0);
    expect(decision.estimatedCostCents).toBeGreaterThanOrEqual(0);
  });
});
