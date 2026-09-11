/**
 * Execution runtimes are trust-boundary declarations, not provider names.
 * A graph node asks for capabilities; the engine chooses an eligible runtime.
 */
export type ExecutionRuntimeKind =
  | 'cloud_sandbox'
  | 'cloud_automation'
  | 'desktop_local';

export type ExecutionRuntimeCapability =
  | 'command.exec'
  | 'filesystem.read'
  | 'filesystem.write'
  | 'git.clone'
  | 'git.read'
  | 'git.write'
  | 'network.outbound'
  | 'interactive.process';

export type ExecutionRuntimeState = 'online' | 'draining' | 'offline';

export interface ExecutionRuntimeDescriptor {
  id: string;
  tenantId: string;
  kind: ExecutionRuntimeKind;
  state: ExecutionRuntimeState;
  capabilities: readonly ExecutionRuntimeCapability[];
  lastHeartbeatAt: string;
  metadata?: Record<string, string>;
}

export interface RuntimeExecutionRequest {
  runtimeId: string;
  graphId: string;
  nodeId: string;
  attemptId: string;
  executionOwner: string;
  executionVersion: number;
  leaseExpiresAt: string;
  capability: ExecutionRuntimeCapability;
  workingDirectory?: string;
  command?: string;
  args?: readonly string[];
  /** Signed monotonic fence supplied to the runtime target. */
  fenceToken?: string;
}

export type RuntimeExecutionOutcome =
  | 'completed'
  | 'failed'
  | 'timed_out'
  | 'possibly_succeeded'
  | 'unknown';

export interface RuntimeExecutionResult {
  runtimeId: string;
  graphId: string;
  nodeId: string;
  attemptId: string;
  outcome: RuntimeExecutionOutcome;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  startedAt: string;
  finishedAt: string;
  externalOperationId?: string;
  error?: string;
  /** Present when a recovery worker owns the runtime execution record. */
  recoveryVersion?: number;
  /** Target acknowledgement that its local fence accepted the supplied generation. */
  acceptedFenceVersion?: number;
}
