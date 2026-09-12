import { describe, expect, it } from 'vitest';
import { classifyExecutionContradiction } from './execution-contradictions';

describe('execution contradiction classification',()=>{
  it('classifies stale fencing as concurrency',()=>expect(classifyExecutionContradiction(new Error('Graph execution lease lost'))).toEqual({category:'concurrency',message:'Graph execution lease lost'}));
  it('classifies terminal unresolved effects as integrity',()=>expect(classifyExecutionContradiction(new Error('Graph cannot become terminal with unresolved runtime side effects'))?.category).toBe('integrity'));
  it('classifies expected-version conflicts as integrity',()=>expect(classifyExecutionContradiction(new Error('Project file version conflict or execution fence lost'))?.category).toBe('concurrency'));
  it('does not turn ordinary provider failures into contradictions',()=>expect(classifyExecutionContradiction(new Error('Provider returned 500'))).toBeNull());
});
