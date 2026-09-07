import { describe, expect, it } from 'vitest';
import { verifyRuntimeResult } from './graph-verification';

describe('graph runtime verification', () => {
  it('fails non-zero execution even when runtime reports success', () => {
    const result = verifyRuntimeResult({ jobId: 'job-1', status: 'succeeded', exitCode: 2, output: 'tests failed' });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('exit code 2');
  });

  it('verifies required output text instead of trusting exit code alone', () => {
    const result = verifyRuntimeResult({ jobId: 'job-2', status: 'succeeded', exitCode: 0, output: '3 products found' }, 'output contains "products"');
    expect(result.passed).toBe(true);
  });

  it('rejects missing required output text', () => {
    const result = verifyRuntimeResult({ jobId: 'job-3', status: 'succeeded', exitCode: 0, output: '0 products found' }, 'output contains "20 products"');
    expect(result.passed).toBe(false);
  });

  it('supports minimum result/line criteria', () => {
    const result = verifyRuntimeResult({ jobId: 'job-4', status: 'succeeded', exitCode: 0, output: 'a\nb\nc' }, 'at least 3 results');
    expect(result.passed).toBe(true);
  });

  it('fails unsupported criteria closed', () => {
    const result = verifyRuntimeResult({ jobId: 'job-5', status: 'succeeded', exitCode: 0, output: 'done' }, '20 products must exist in database');
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('Unsupported success criterion');
  });
});
