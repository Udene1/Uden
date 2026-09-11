import { describe, expect, it } from 'vitest';
import type { TaskNode } from '@ai-work-partner/shared';
import { deriveCapabilityPolicy, assertCapabilityPolicy } from './capability-policy';

const node = (overrides: Partial<TaskNode> = {}): TaskNode => ({
  id: 'n', title: 'execute', prompt: 'run', domain: 'coding', complexity: 5, expectedFormat: 'text', recommendedTier: 2,
  dependencies: [], contextFrom: [], attemptedModels: [], status: 'ready', kind: 'project-tool', tool: 'execute', ...overrides,
});

describe('capability policy', () => {
  it('requires approval for filesystem and git writes', () => {
    expect(deriveCapabilityPolicy(node({ runtimeCapability: 'filesystem.write' })).approvalRequired).toBe(true);
    expect(deriveCapabilityPolicy(node({ runtimeCapability: 'git.write' })).riskLevel).toBe('high');
  });
  it('treats local outbound networking as critical', () => {
    const policy = deriveCapabilityPolicy(node({ runtimeCapability: 'network.outbound', preferredRuntimeKind: 'desktop_local' }));
    expect(policy.riskLevel).toBe('critical');
    expect(policy.approvalRequired).toBe(true);
  });
  it('rejects runtime capability on model-only nodes', () => {
    expect(() => assertCapabilityPolicy(node({ kind: 'model', runtimeCapability: 'command.exec' }))).toThrow('requires a project-tool node');
  });
});
