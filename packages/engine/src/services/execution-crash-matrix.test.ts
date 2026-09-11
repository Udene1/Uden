import { describe, expect, it } from 'vitest';
import { isRetrySafe, requiresReconciliation } from './external-attempts';

type CrashPoint='before_authorization'|'after_authorization'|'before_external_effect'|'after_external_effect'|'before_acknowledgement'|'after_acknowledgement';

function durableOutcome(point:CrashPoint):'not_started'|'in_flight'|'possibly_succeeded'{
  if(point==='before_authorization')return 'not_started';
  if(point==='before_external_effect')return 'in_flight';
  return 'possibly_succeeded';
}

describe('external-effect crash matrix',()=>{
  it.each<CrashPoint>(['before_authorization','after_authorization','before_external_effect','after_external_effect','before_acknowledgement','after_acknowledgement'])('never treats %s as an implicit success',point=>{
    const outcome=durableOutcome(point);
    expect(outcome==='possibly_succeeded' ? requiresReconciliation('possibly_succeeded') : true).toBe(true);
    if(outcome==='not_started')expect(isRetrySafe(outcome)).toBe(true);
    else expect(isRetrySafe(outcome)).toBe(false);
  });

  it('requires reconciliation after an effect may have happened',()=>{
    expect(requiresReconciliation('in_flight')).toBe(true);
    expect(requiresReconciliation('possibly_succeeded')).toBe(true);
    expect(requiresReconciliation('unknown')).toBe(true);
  });

  it('only a proven failed or never-started attempt is retry-safe',()=>{
    expect(isRetrySafe('not_started')).toBe(true);
    expect(isRetrySafe('failed')).toBe(true);
    expect(isRetrySafe('completed')).toBe(false);
    expect(isRetrySafe('possibly_succeeded')).toBe(false);
    expect(isRetrySafe('unknown')).toBe(false);
  });
});
