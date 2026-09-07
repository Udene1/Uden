import type { HonoEnv } from '../types';
import type { TaskNode, TaskNodeVerification } from '@ai-work-partner/shared';
import { listProjectFiles, type RuntimeResult } from './project-runtime';

export interface RuntimeVerificationInput {
  result: RuntimeResult;
  node: TaskNode;
  tenantId: string;
  projectId: string;
}

export interface RuntimeVerificationResult extends TaskNodeVerification {
  artifacts?: string[];
}

function success(result: RuntimeResult, reason: string, artifacts?: string[]): RuntimeVerificationResult {
  return { passed: true, reason, checkedAt: new Date().toISOString(), artifacts };
}

function failure(reason: string): RuntimeVerificationResult {
  return { passed: false, reason, checkedAt: new Date().toISOString() };
}

export async function verifyRuntimeResult(env: HonoEnv['Bindings'], input: RuntimeVerificationInput): Promise<RuntimeVerificationResult> {
  const { result, node, tenantId, projectId } = input;
  if (result.status !== 'succeeded') return failure(result.output || `Runtime ended with status ${result.status}`);
  if (result.exitCode !== undefined && result.exitCode !== 0) return failure(`Runtime exited with code ${result.exitCode}`);

  const files = await listProjectFiles(env, tenantId, projectId);
  const criteria = node.toolInput?.successCriteria;
  if (typeof criteria === 'object' && criteria !== null) {
    const requiredPaths = Array.isArray((criteria as Record<string, unknown>).requiredPaths)
      ? ((criteria as Record<string, unknown>).requiredPaths as unknown[]).filter((p): p is string => typeof p === 'string')
      : [];
    const missing = requiredPaths.filter(path => !files.some(file => file.path === path));
    if (missing.length) return failure(`Required artifacts are missing: ${missing.join(', ')}`);
  }

  const artifacts = files.map(file => file.path);
  return success(result, 'Runtime completed successfully and objective baseline verification passed', artifacts);
}
