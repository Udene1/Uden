import { DEFAULT_ENGINE_URL } from '@ai-work-partner/shared';
export type TaskStatus = 'pending' | 'classifying' | 'routing' | 'processing' | 'quality-check' | 'escalating' | 'completed' | 'failed' | 'awaiting-approval' | 'approved' | 'rejected';

export interface Tenant { id: string; name: string; email?: string; }
export interface Task { id: string; prompt: string; status: TaskStatus; mode?: 'permissionless' | 'permission-based'; output?: string; totalCostCents: number; modelUsed?: string; qualityScore?: number; createdAt: string; completedAt?: string; }

export class EngineApi {
  constructor(private readonly baseUrl: string, private readonly credential: string) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
      ...init,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${this.credential}`, ...(init.headers ?? {}) },
    });
    const body = await response.text();
    let parsed: unknown = null;
    try { parsed = body ? JSON.parse(body) : null; } catch { parsed = body; }
    if (!response.ok) {
      const message = typeof parsed === 'object' && parsed && 'error' in parsed ? String((parsed as { error: unknown }).error) : `Engine request failed (${response.status}).`;
      throw new Error(message);
    }
    return parsed as T;
  }

  static async fromApiKey(baseUrl: string, apiKey: string) {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/auth/session`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, client: 'desktop' }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || `Engine authentication failed (${response.status})`);
    return new EngineApi(baseUrl, body.session_token as string);
  }

  getTenant() { return this.request<{ tenant: Tenant }>('/tenant'); }
  registerTenant(name: string, email = '') { return this.request<{ tenant: Tenant; api_key: string }>('/tenants', { method: 'POST', body: JSON.stringify({ name, email }) }); }
  getTasks() { return this.request<Task[]>('/tasks'); }
  getTask(id: string) { return this.request<Task>(`/tasks/${encodeURIComponent(id)}`); }
  createTask(prompt: string, mode: Task['mode'] = 'permissionless') { return this.request<Task>('/tasks', { method: 'POST', body: JSON.stringify({ prompt, mode }) }); }
  approveTask(id: string) { return this.request<Task>(`/tasks/${encodeURIComponent(id)}/approve`, { method: 'POST', body: JSON.stringify({}) }); }
  planGraph(prompt: string) { return this.request<{ plan: unknown; graph: unknown; approval: { required: boolean; reasons?: string[]; nodes?: string[] } }>('/tasks/plan', { method: 'POST', body: JSON.stringify({ prompt }) }); }
  executeGraph(plan: unknown, approved = false) { return this.request<{ graph: any; status?: string }>('/tasks/graph/execute', { method: 'POST', body: JSON.stringify({ plan, approved }) }); }
  getGraphs() { return this.request<{ graphs: any[] }>('/tasks/graphs'); }
  getGraph(id: string) { return this.request<{ graph: any }>(`/tasks/graph/${encodeURIComponent(id)}`); }
  resumeGraph(id: string) { return this.request<{ graph: any; status?: string }>(`/tasks/graph/${encodeURIComponent(id)}/resume`, { method: 'POST' }); }
}
export const defaultEngineUrl = () => import.meta.env.VITE_ENGINE_URL || DEFAULT_ENGINE_URL;
