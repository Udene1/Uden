import { describe, expect, it } from 'vitest';
import { getCodeSource } from './code-source';

describe('provider-neutral code source', () => {
  it('keeps GitHub and Origin repository references provider-safe', async () => {
    const source = getCodeSource('github');
    await expect(source.getRepository({} as any, 'tenant', { provider: 'origin', owner: 'team', repo: 'service' })).rejects.toThrow('provider mismatch');
  });

  it('exposes the same mutation boundary for both supported providers', () => {
    const github = getCodeSource('github');
    const origin = getCodeSource('origin');
    expect(github.provider).toBe('github');
    expect(origin.provider).toBe('origin');
    expect(typeof github.commitFiles).toBe('function');
    expect(typeof github.mergePullRequest).toBe('function');
    expect(typeof origin.commitFiles).toBe('function');
    expect(typeof origin.mergePullRequest).toBe('function');
  });
});
