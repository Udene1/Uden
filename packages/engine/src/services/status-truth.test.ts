import { describe, expect, it } from 'vitest';
import { canClaimTerminalStatus, truthfulNodeStatus } from './status-truth';

describe('execution status truthfulness',()=>{
  it('surfaces unresolved external effects instead of graph failure',()=>expect(truthfulNodeStatus({persistedStatus:'failed',unresolvedProvider:false,unresolvedRuntime:true,unresolvedRepository:false})).toBe('awaiting-reconciliation'));
  it('allows completed only when every external effect is resolved',()=>{expect(canClaimTerminalStatus({unresolvedProvider:false,unresolvedRuntime:false,unresolvedRepository:false})).toBe(true);expect(canClaimTerminalStatus({unresolvedProvider:true,unresolvedRuntime:false,unresolvedRepository:false})).toBe(false);});
  it('preserves proven failure when nothing is unresolved',()=>expect(truthfulNodeStatus({persistedStatus:'failed',unresolvedProvider:false,unresolvedRuntime:false,unresolvedRepository:false})).toBe('failed'));
});
