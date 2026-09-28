import { describe, expect, it } from 'vitest';
import { modelIdForRegistry, parseModelReference } from './connection';

describe('model connections', () => {
  it('keeps existing model ids on native providers', () => {
    expect(parseModelReference('deepseek-v3')).toEqual({
      modelId: 'deepseek-v3',
      connection: 'native',
    });
  });

  it('selects AgentRouter without changing the underlying model id', () => {
    expect(parseModelReference('agentrouter/deepseek-v3')).toEqual({
      modelId: 'deepseek-v3',
      connection: 'agentrouter',
    });
    expect(parseModelReference('agentrouter/claude-sonnet')).toEqual({
      modelId: 'claude-sonnet',
      connection: 'agentrouter',
    });
  });

  it('normalizes connection-qualified ids for registry pricing', () => {
    expect(modelIdForRegistry('agentrouter/gpt-4o')).toBe('gpt-4o');
  });
});
