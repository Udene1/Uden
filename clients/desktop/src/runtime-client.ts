import type {
  ExecutionRuntimeCapability,
  ExecutionRuntimeDescriptor,
  RuntimeExecutionRequest,
  RuntimeExecutionResult,
} from '@ai-work-partner/shared';

export interface RuntimeClientConfig {
  apiBaseUrl: string;
  apiKey: string;
}

export interface RuntimeRegistration {
  id: string;
  tenantId: string;
  kind: 'desktop_local';
  state: 'online' | 'draining' | 'offline';
  capabilities: readonly ExecutionRuntimeCapability[];
  lastHeartbeatAt: string;
  metadata?: Record<string, string>;
}

export interface RuntimeExecutionCompletion {
  outcome: RuntimeExecutionResult['outcome'];
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  startedAt: string;
  finishedAt: string;
  externalOperationId?: string;
  error?: string;
}

export class DurableRuntimeClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: RuntimeClientConfig) {
    this.baseUrl = config.apiBaseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    if (!this.baseUrl) throw new Error('Runtime API base URL is required');
    if (!this.apiKey) throw new Error('Runtime API key is required');
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${this.apiKey}`);
    headers.set('Content-Type', 'application/json');
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    const body = await response.text();
    let parsed: unknown = undefined;
    if (body) {
      try { parsed = JSON.parse(body); } catch { parsed = body; }
    }
    if (!response.ok) {
      const message = typeof parsed === 'object' && parsed !== null && 'error' in parsed
        ? String((parsed as { error?: unknown }).error)
        : `Runtime API request failed (${response.status})`;
      throw new Error(message);
    }
    return parsed as T;
  }

  async register(registration: RuntimeRegistration): Promise<ExecutionRuntimeDescriptor> {
    return this.request<ExecutionRuntimeDescriptor>('/api/v1/runtimes/register', {
      method: 'POST',
      body: JSON.stringify({ ...registration, kind: 'desktop_local' }),
    });
  }

  async heartbeat(runtimeId: string, state: RuntimeRegistration['state'] = 'online'): Promise<ExecutionRuntimeDescriptor> {
    return this.request<ExecutionRuntimeDescriptor>(`/api/v1/runtimes/${encodeURIComponent(runtimeId)}/heartbeat?state=${encodeURIComponent(state)}`, {
      method: 'POST',
      body: '{}',
    });
  }

  async eligible(capability: ExecutionRuntimeCapability): Promise<ExecutionRuntimeDescriptor[]> {
    return this.request<ExecutionRuntimeDescriptor[]>(`/api/v1/runtimes/?capability=${encodeURIComponent(capability)}`);
  }

  async authorize(request: RuntimeExecutionRequest): Promise<RuntimeExecutionResult> {
    return this.request<RuntimeExecutionResult>('/api/v1/runtimes/executions/authorize', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async markInFlight(request: RuntimeExecutionRequest): Promise<RuntimeExecutionResult> {
    return this.request<RuntimeExecutionResult>('/api/v1/runtimes/executions/in-flight', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async complete(request: RuntimeExecutionRequest, result: RuntimeExecutionCompletion): Promise<RuntimeExecutionResult> {
    return this.request<RuntimeExecutionResult>('/api/v1/runtimes/executions/complete', {
      method: 'POST',
      body: JSON.stringify({ request, result: { ...result, runtimeId: request.runtimeId, graphId: request.graphId, nodeId: request.nodeId, attemptId: request.attemptId } }),
    });
  }

  async recoverable(): Promise<RuntimeExecutionResult[]> {
    return this.request<RuntimeExecutionResult[]>('/api/v1/runtimes/recoverable');
  }
}
