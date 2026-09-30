import { describe, expect, it, vi } from 'vitest';
import { modelIdForRegistry, parseModelReference, resolveConnectionCandidates } from './connection';

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

  it('resolves preferred families to live AgentRouter model ids instead of pinned versions', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      data: [
        { id: 'deepseek-v4-pro' },
        { id: 'gpt-5.5' },
        { id: 'claude-opus-4-8' },
      ],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const env = {
      AGENTROUTER_API_KEY: 'test-key',
      CACHE_KV: {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
      },
    } as never;

    await expect(resolveConnectionCandidates(env, ['deepseek-v3', 'o3-mini'])).resolves.toEqual([
      'agentrouter/deepseek-v4-pro',
      'agentrouter/gpt-5.5',
      'deepseek-v3',
      'o3-mini',
    ]);

    fetchMock.mockRestore();
  });

  it('does not replace native routing when AgentRouter discovery is unavailable', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('discovery unavailable'));
    const env = {
      AGENTROUTER_API_KEY: 'test-key',
      CACHE_KV: {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
      },
    } as never;

    await expect(resolveConnectionCandidates(env, ['deepseek-v3', 'o3-mini'])).resolves.toEqual([
      'deepseek-v3',
      'o3-mini',
    ]);

    fetchMock.mockRestore();
  });
});
