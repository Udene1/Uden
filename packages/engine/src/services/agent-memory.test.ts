import { describe, expect, it } from 'vitest';
import { formatMemoryContext, remember, type AgentMemory } from './agent-memory';

describe('agent memory', () => {
  it('requires graph and node identity for node-scoped memory', async () => {
    const env = { DB: undefined } as never;
    await expect(remember(env, 'tenant-1', {
      kind: 'fact',
      scope: 'node',
      key: 'missing-node',
      content: 'value',
      sourceType: 'test',
      confidence: 1,
    })).rejects.toThrow('Node memory requires graphId and nodeId');
  });

  it('bounds memory context before it reaches a model', () => {
    const memories: AgentMemory[] = Array.from({ length: 20 }, (_, index) => ({
      id: `m-${index}`,
      tenantId: 'tenant-1',
      graphId: 'graph-1',
      nodeId: `node-${index}`,
      kind: 'fact',
      scope: 'node',
      key: `key-${index}`,
      content: 'x'.repeat(2_000),
      sourceType: 'test',
      confidence: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    const context = formatMemoryContext(memories);
    expect(context.length).toBeLessThanOrEqual(24_000);
    expect(context.startsWith('## Durable memory')).toBe(true);
  });
});
