import { describe, expect, it } from 'vitest';
import { retryWithBackoff } from './retry';

describe('retryWithBackoff', () => {
  it('retries transient work and succeeds', async () => {
    let attempts = 0;
    const result = await retryWithBackoff(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error('temporary failure');
      return 'ok';
    }, () => true, 2, 1);
    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('does not retry non-retryable failures', async () => {
    let attempts = 0;
    await expect(retryWithBackoff(async () => { attempts += 1; throw new Error('permanent'); }, () => false, 2, 1)).rejects.toThrow('permanent');
    expect(attempts).toBe(1);
  });
});
