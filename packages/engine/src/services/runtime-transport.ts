import type { Env } from '../types';
import type { ExecutionRuntimeCapability, ExecutionRuntimeKind, RuntimeExecutionRequest, RuntimeExecutionResult } from '@ai-work-partner/shared';
import { authorizeRuntimeExecution, completeRuntimeExecution, markRuntimeExecutionInFlight } from './execution-runtimes';
import { selectExecutionRuntime } from './runtime-routing';
import type { ExecutionFence } from './execution-side-effects';
import { createRuntimeFenceToken, runtimeFenceClaims, RUNTIME_FENCE_PROTOCOL } from './runtime-fence';

const MAX_OUTPUT = 100_000;
const MAX_COMMAND = 2_000;

export interface RuntimeDispatchRequest {
  graphId: string;
  nodeId: string;
  attemptId: string;
  capability: ExecutionRuntimeCapability;
  executionOwner: string;
  executionVersion: number;
  leaseExpiresAt: string;
  command: string;
  args?: readonly string[];
  workingDirectory?: string;
  preferredKind?: ExecutionRuntimeKind;
}

interface RuntimeTransportResponse {
  jobId?: string;
  externalOperationId?: string;
  outcome?: RuntimeExecutionResult['outcome'];
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
  acceptedFenceVersion?: number;
}

function runtimeEndpoint(metadata: Record<string, string> | undefined): string {
  const value = metadata?.endpoint?.trim();
  if (!value) throw new Error('Selected execution runtime has no transport endpoint');
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Execution runtime endpoint is invalid'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Execution runtime endpoint must use HTTPS without embedded credentials');
  return url.toString().replace(/\/$/, '');
}

function sanitizeResult(value: RuntimeTransportResponse): RuntimeExecutionResult['outcome'] {
  if (value.outcome === 'completed' || value.outcome === 'failed' || value.outcome === 'timed_out' || value.outcome === 'possibly_succeeded' || value.outcome === 'unknown') return value.outcome;
  if (value.exitCode !== undefined) return value.exitCode === 0 ? 'completed' : 'failed';
  return 'possibly_succeeded';
}

export async function dispatchRuntimeExecution(
  env: Env,
  tenantId: string,
  request: RuntimeDispatchRequest,
): Promise<RuntimeExecutionResult> {
  const command = request.command.trim();
  if (!command || command.length > MAX_COMMAND || /[\r\n]/.test(command)) throw new Error('Invalid runtime command');

  const runtime = await selectExecutionRuntime(env.DB, tenantId, request.capability, request.preferredKind);
  if (!runtime) throw new Error(`No live runtime advertises capability '${request.capability}'`);

  const transportRequest: RuntimeExecutionRequest = {
    runtimeId: runtime.id,
    graphId: request.graphId,
    nodeId: request.nodeId,
    attemptId: request.attemptId,
    executionOwner: request.executionOwner,
    executionVersion: request.executionVersion,
    leaseExpiresAt: request.leaseExpiresAt,
    capability: request.capability,
    workingDirectory: request.workingDirectory,
    command,
    args: request.args,
  };

  await authorizeRuntimeExecution(env.DB, tenantId, transportRequest);
  await markRuntimeExecutionInFlight(env.DB, tenantId, transportRequest);

  const endpoint = runtimeEndpoint(runtime.metadata);
  const secret = env.PROJECT_RUNTIME_SECRET;
  if (!secret) {
    await completeRuntimeExecution(env.DB, tenantId, transportRequest, {
      runtimeId: runtime.id, graphId: request.graphId, nodeId: request.nodeId, attemptId: request.attemptId,
      outcome: 'possibly_succeeded', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
      error: 'Execution runtime transport secret is not configured',
    });
    throw new Error('Execution runtime transport is not configured');
  }

  const fenceToken = await createRuntimeFenceToken(runtimeFenceClaims(transportRequest, tenantId), secret);
  const body = JSON.stringify({
    tenantId,
    runtimeId: runtime.id,
    graphId: request.graphId,
    nodeId: request.nodeId,
    attemptId: request.attemptId,
    executionOwner: request.executionOwner,
    executionVersion: request.executionVersion,
    leaseExpiresAt: request.leaseExpiresAt,
    capability: request.capability,
    command,
    args: request.args ?? [],
    workingDirectory: request.workingDirectory,
    fenceProtocol: RUNTIME_FENCE_PROTOCOL,
    fenceToken,
  });
  const timestamp = String(Date.now());
  // The signed fence token is included in the transport body signature too,
  // so the target cannot accept a token detached from the operation payload.
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${body}`)));
  let binary = ''; for (const byte of digest) binary += String.fromCharCode(byte);
  const signature = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  let response: Response;
  try {
    response = await fetch(`${endpoint}/v1/executions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-uden-timestamp': timestamp, 'x-uden-signature': signature, 'x-uden-fence-version': String(request.executionVersion), 'x-uden-fence-owner': request.executionOwner, 'x-uden-fence-protocol': RUNTIME_FENCE_PROTOCOL },
      body,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Runtime transport request failed';
    return completeRuntimeExecution(env.DB, tenantId, transportRequest, {
      runtimeId: runtime.id, graphId: request.graphId, nodeId: request.nodeId, attemptId: request.attemptId,
      outcome: 'possibly_succeeded', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), error: message.slice(0, 4000),
    });
  }

  let payload: RuntimeTransportResponse = {};
  try { payload = await response.json() as RuntimeTransportResponse; } catch { payload = {}; }
  const now = new Date().toISOString();
  const result: RuntimeExecutionResult = {
    runtimeId: runtime.id, graphId: request.graphId, nodeId: request.nodeId, attemptId: request.attemptId,
    outcome: response.ok ? sanitizeResult(payload) : 'possibly_succeeded',
    exitCode: payload.exitCode,
    stdout: payload.stdout?.slice(0, MAX_OUTPUT),
    stderr: payload.stderr?.slice(0, MAX_OUTPUT),
    startedAt: payload.startedAt ?? now,
    finishedAt: payload.finishedAt ?? now,
    externalOperationId: payload.externalOperationId ?? payload.jobId,
    error: response.ok ? payload.error : `Runtime transport returned HTTP ${response.status}`,
    acceptedFenceVersion: payload.acceptedFenceVersion,
  };
  if (response.ok && result.acceptedFenceVersion !== undefined && result.acceptedFenceVersion !== request.executionVersion) {
    result.outcome = 'possibly_succeeded';
    result.error = `Runtime target acknowledged fence generation ${result.acceptedFenceVersion}; expected ${request.executionVersion}`;
  }
  return completeRuntimeExecution(env.DB, tenantId, transportRequest, result);
}

export async function assertRuntimeContinuationFence(env: Env, fence: ExecutionFence): Promise<void> {
  if (!fence.tenantId || !fence.graphId) throw new Error('Runtime continuation fence is required');
  const row = await env.DB.prepare('SELECT 1 AS valid FROM task_graphs WHERE id=? AND tenant_id=? AND execution_owner=? AND execution_version=? AND lease_until>=CURRENT_TIMESTAMP').bind(fence.graphId, fence.tenantId, fence.owner, fence.fenceVersion).first();
  if (!row) throw new Error('Graph execution lease lost');
}
