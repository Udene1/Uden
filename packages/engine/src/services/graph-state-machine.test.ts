import { describe, expect, it } from 'vitest';
import { assertGraphHasNoUnresolvedExternalEffects, assertGraphTransition, assertNodeTransition } from './graph-state-machine';

describe('graph state machine',()=>{
  it('rejects terminal completion from a failed node without repair',()=>expect(()=>assertNodeTransition('failed','completed')).toThrow('Illegal task graph node status transition'));
  it('allows explicit reconciliation after a running external effect becomes uncertain',()=>expect(()=>assertNodeTransition('running','awaiting-reconciliation')).not.toThrow());
  it('rejects terminal graph state while an external effect is unresolved',()=>expect(()=>assertGraphHasNoUnresolvedExternalEffects({targetStatus:'failed',unresolvedRuntimeCount:1,unresolvedRepositoryCount:0})).toThrow('reconciliation'));
  it('allows terminal graph state once all external effects are resolved',()=>expect(()=>assertGraphHasNoUnresolvedExternalEffects({targetStatus:'completed',unresolvedRuntimeCount:0,unresolvedRepositoryCount:0})).not.toThrow());
  it('allows a failed graph to be explicitly resumed',()=>expect(()=>assertGraphTransition('failed','running')).not.toThrow());
  it('rejects a completed graph being reopened implicitly',()=>expect(()=>assertGraphTransition('completed','running')).toThrow('Illegal task graph status transition'));
});
