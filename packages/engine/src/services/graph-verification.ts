import type { TaskGraph, TaskNode, TaskNodeVerification } from '@ai-work-partner/shared';
import type { RuntimeResult } from './project-runtime';

export const MAX_REPAIR_ATTEMPTS = 3;
export interface VerificationResult extends TaskNodeVerification { artifact?: string; }
interface CriterionCheck { passed: boolean; reason: string; }

function evaluateCriteria(output: string, successCriteria: string): CriterionCheck {
  const criteria = successCriteria.trim();
  if (!criteria) return { passed: true, reason: 'No semantic success criteria supplied; runtime exit status is authoritative' };
  const checks: CriterionCheck[] = [];
  for (const raw of criteria.split(/\s*(?:&&|\band\b)\s*/i).filter(Boolean)) {
    const criterion = raw.trim();
    if (/^exit\s*code\s*(?:=|is|equals)\s*0$/i.test(criterion)) { checks.push({ passed: true, reason: 'Exit code is 0' }); continue; }
    const containsMatch = criterion.match(/^(?:output\s+)?(?:contains|includes)\s+["'](.+)["']$/i);
    if (containsMatch) { const expected = containsMatch[1]; const passed = output.includes(expected); checks.push({ passed, reason: passed ? `Output contains required text: ${expected}` : `Output does not contain required text: ${expected}` }); continue; }
    const countMatch = criterion.match(/^(?:output\s+)?(?:contains|includes|has)\s*(?:at\s+least\s*)?(\d+)\s+(?:items|results|lines)$/i);
    if (countMatch) { const minimum = Number(countMatch[1]); const observed = output.split(/\r?\n/).map(line => line.trim()).filter(Boolean).length; const passed = observed >= minimum; checks.push({ passed, reason: passed ? `Output contains at least ${minimum} non-empty lines` : `Expected at least ${minimum} non-empty lines but observed ${observed}` }); continue; }
    const lengthMatch = criterion.match(/^output\s+length\s*(>=|>)\s*(\d+)$/i);
    if (lengthMatch) { const minimum = Number(lengthMatch[2]); const passed = lengthMatch[1] === '>=' ? output.length >= minimum : output.length > minimum; checks.push({ passed, reason: passed ? `Output length satisfies ${lengthMatch[1]} ${minimum}` : `Output length ${output.length} does not satisfy ${lengthMatch[1]} ${minimum}` }); continue; }
    checks.push({ passed: false, reason: `Unsupported success criterion: ${criterion}` });
  }
  const failed = checks.filter(check => !check.passed);
  return { passed: failed.length === 0, reason: failed.length === 0 ? checks.map(check => check.reason).join('; ') : failed.map(check => check.reason).join('; ') };
}

export function verifyRuntimeResult(result: RuntimeResult, successCriteria?: string): VerificationResult {
  const checkedAt = new Date().toISOString();
  if (result.status === 'queued' || result.status === 'running') return { passed: false, reason: 'Runtime execution is not terminal', checkedAt };
  if (result.status === 'failed') return { passed: false, reason: result.output || `Runtime execution failed with exit code ${result.exitCode ?? 'unknown'}`, checkedAt, artifact: result.output };
  if (result.exitCode !== undefined && result.exitCode !== 0) return { passed: false, reason: `Runtime exited with code ${result.exitCode}`, checkedAt, artifact: result.output };
  const output = result.output || '';
  const criteria = evaluateCriteria(output, successCriteria || '');
  if (!criteria.passed) return { passed: false, reason: criteria.reason, checkedAt, artifact: output };
  return { passed: true, reason: criteria.reason || 'Runtime completed with exit code 0', checkedAt, artifact: output };
}

export function shouldRepairNode(node: TaskNode): boolean { return node.status === 'failed' && (node.repairAttempts || 0) < MAX_REPAIR_ATTEMPTS; }
export function nextRepairAttempt(node: TaskNode): number { return (node.repairAttempts || 0) + 1; }
export function buildRepairContext(graph: TaskGraph, node: TaskNode): string {
  const dependencyOutput = node.dependencies.map(id => graph.nodes.find(candidate => candidate.id === id)).filter((candidate): candidate is TaskNode => Boolean(candidate?.output)).map(candidate => `Dependency ${candidate.id}:\n${candidate.output}`).join('\n\n');
  return [`Node: ${node.id}`, `Goal: ${graph.goal}`, `Prompt: ${node.prompt}`, `Failure: ${node.error || 'unknown'}`, `Verification: ${node.verification?.reason || 'not available'}`, dependencyOutput, 'Repair must address the observed failure only; do not invent APIs, credentials, test results, or successful outcomes.'].filter(Boolean).join('\n\n');
}
