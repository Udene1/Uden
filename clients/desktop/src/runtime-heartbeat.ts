import type { ExecutionRuntimeCapability, ExecutionRuntimeDescriptor } from '@ai-work-partner/shared';
import { DurableRuntimeClient } from './runtime-client';

export interface RuntimeHeartbeatSupervisorConfig {
  runtimeId: string;
  capabilities: readonly ExecutionRuntimeCapability[];
  metadata?: Record<string, string>;
  intervalMs?: number;
}

export class RuntimeHeartbeatSupervisor {
  private timer: ReturnType<typeof setInterval> | undefined;
  private stopped = false;
  private current: ExecutionRuntimeDescriptor | undefined;

  constructor(
    private readonly client: DurableRuntimeClient,
    private readonly config: RuntimeHeartbeatSupervisorConfig,
  ) {}

  get descriptor(): ExecutionRuntimeDescriptor | undefined {
    return this.current;
  }

  async start(): Promise<ExecutionRuntimeDescriptor> {
    if (this.stopped) throw new Error('Runtime heartbeat supervisor is stopped');
    this.current = await this.client.register({
      id: this.config.runtimeId,
      kind: 'desktop_local',
      state: 'online',
      capabilities: this.config.capabilities,
      metadata: this.config.metadata,
    });
    const interval = Math.max(10_000, this.config.intervalMs ?? 30_000);
    this.timer = setInterval(() => {
      void this.heartbeat();
    }, interval);
    return this.current;
  }

  async heartbeat(): Promise<ExecutionRuntimeDescriptor> {
    if (this.stopped) throw new Error('Runtime heartbeat supervisor is stopped');
    this.current = await this.client.heartbeat(this.config.runtimeId, 'online');
    return this.current;
  }

  async drain(): Promise<void> {
    if (this.stopped) return;
    this.current = await this.client.heartbeat(this.config.runtimeId, 'draining');
  }

  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    try {
      this.current = await this.client.heartbeat(this.config.runtimeId, 'offline');
    } catch {
      // Shutdown must not hang on a network failure. Server-side heartbeat expiry
      // remains the authoritative recovery mechanism.
    }
  }
}
