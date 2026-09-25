export type TaskStatus = 'pending' | 'classifying' | 'routing' | 'processing' | 'quality-check' | 'escalating' | 'completed' | 'failed' | 'awaiting-approval' | 'approved' | 'rejected';

export interface Tenant { id: string; name: string; email?: string; }

export interface Task {
  id: string;
  prompt: string;
  status: TaskStatus;
  mode?: 'permissionless' | 'permission-based';
  output?: string;
  totalCostCents: number;
  modelUsed?: string;
  qualityScore?: number;
  createdAt: string;
  completedAt?: string;
}

export class EngineApi {
  constructor(private readonly baseUrl: string, private readonly apiKey: string) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...(init.headers ?? {}),
      },
    });
    const body = await response.text();
    let parsed: unknown = null;
    try { parsed = body ? JSON.parse(body) : null; } catch { parsed = body; }
    if (!response.ok) {
      const message = typeof parsed === 'object' && parsed && 'message' in parsed ? String((parsed as { message: unknown }).message) : `Engine request failed (${response.status}).`;
      throw new Error(message);
    }
    return parsed as T;
  }

  getTenant() { return this.request<{ tenant: Tenant }>('/tenant'); }
  registerTenant(name: string, email = '') { return this.request<{ tenant: Tenant; api_key: string }>('/tenants', { method: 'POST', body: JSON.stringify({ name, email }) }); }
  getTasks() { return this.request<Task[]>('/tasks'); }
  getTask(id: string) { return this.request<Task>(`/tasks/${encodeURIComponent(id)}`); }
  createTask(prompt: string, mode: Task['mode'] = 'permissionless') {
    return this.request<Task>('/tasks', { method: 'POST', body: JSON.stringify({ prompt, mode }) });
  }
  approveTask(id: string) {
    return this.request<Task>(`/tasks/${encodeURIComponent(id)}/approve`, { method: 'POST', body: JSON.stringify({}) });
  }
}

export const defaultEngineUrl = () => import.meta.env.VITE_ENGINE_URL || '/api/v1';
