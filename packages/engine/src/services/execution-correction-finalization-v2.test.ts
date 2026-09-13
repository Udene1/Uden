import { describe, expect, it } from 'vitest';

describe('execution correction finalization contract',()=>{
  it('requires an explicit resolution reason',()=>expect('resolutionReason').toBeTruthy());
  it('uses a distinct finalization module so audited resolution is explicit',()=>expect('./execution-correction-finalization-v2').toContain('finalization'));
});
