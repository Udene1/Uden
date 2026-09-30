const DEFAULT_ENGINE_URL = 'https://ai-work-partner-engine.uden-production-deployment.workers.dev';
export type TaskStatus =
  | 'pending'
  | 'classifying'
  | 'routing'
  | 'processing'
  | 'quality-check'
  | 'escalating'
  | 'completed'
  | 'failed'
  | 'awaiting-approval'
  | 'approved'
  | 'rejected';

export type TaskMode = 'permissionless' | 'permission-based';

export interface Tenant {
  id: string;
  name: string;
  email?: string;
  qualityPreference?: string;
  monthlyBudgetCents?: number;
  defaultMode?: TaskMode;
}

export interface Task {
  id: string;
  prompt: string;
  status: TaskStatus;
  mode: TaskMode;
  projectId?: string;
  output?: string;
  totalCostCents: number;
  modelUsed?: string;
  qualityScore?: number;
  createdAt: string;
  completedAt?: string;
}

const DEFAULT_BASE = process.env.EXPO_PUBLIC_ENGINE_URL || `${DEFAULT_ENGINE_URL}/api/v1`;

export class EngineApi {
  constructor(private readonly baseUrl: string, private readonly apiKey: string) {}

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...(options.headers || {}),
      },
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body?.error || `Engine request failed (${response.status})`);
    }
    return body as T;
  }

  async registerTenant(name: string, email = ''): Promise<{ tenant: Tenant; api_key: string }> {
    return this.request<{ tenant: Tenant; api_key: string }>('/tenants', { method: 'POST', body: JSON.stringify({ name, email }) });
  }

  async getTenant(): Promise<Tenant> {
    const result = await this.request<{ tenant: Tenant }>('/tenant');
    return result.tenant;
  }

  async createTask(prompt: string, mode: TaskMode = 'permissionless'): Promise<Task> {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify({ prompt, mode }),
    });
  }

  async getTasks(): Promise<Task[]> {
    const result = await this.request<{ tasks: Task[] }>('/tasks');
    return result.tasks || [];
  }

  async getTask(id: string): Promise<Task> {
    const result = await this.request<{ task: Task }>(`/tasks/${id}`);
    return result.task;
  }

  async approveTask(id: string): Promise<Task> {
    return this.request<Task>(`/tasks/${id}/approve`, { method: 'POST', body: '{}' });
  }

  async health(): Promise<{ status: string; database: string }> {
    const response = await fetch(`${this.baseUrl.replace(/\\/$/, '')}/health`);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Health check failed (${response.status})`);
    return body as { status: string; database: string };
  }

  async getProjects(): Promise<any[]> {
    const result = await this.request<{ projects: any[] }>('/projects');
    return result.projects || [];
  }

  async createProject(name: string, description = '') {
    return this.request<{ project: any }>('/projects', { method: 'POST', body: JSON.stringify({ name, description }) });
  }

  async getGraphs(): Promise<any[]> {
    const result = await this.request<{ graphs: any[] }>('/tasks/graphs');
    return result.graphs || [];
  }

  async getGraph(id: string) {
    return this.request<{ graph: any }>(`/tasks/graph/${encodeURIComponent(id)}`);
  }

  async resumeGraph(id: string) {
    return this.request(`/tasks/graph/${encodeURIComponent(id)}/resume`, { method: 'POST', body: '{}' });
  }

  async getGraphApprovals(id: string) {
    return this.request<{ approvals: any[] }>(`/approvals/graphs/${encodeURIComponent(id)}`).then(r => r.approvals || []);
  }

  async approveGraphNode(graphId: string, nodeId: string) {
    return this.request(`/approvals/graphs/${encodeURIComponent(graphId)}/nodes/${encodeURIComponent(nodeId)}/approve`, { method: 'POST', body: '{}' });
  }

  async proposeGraphRepair(graphId: string, nodeId: string) {
    return this.request(`/approvals/graphs/${encodeURIComponent(graphId)}/nodes/${encodeURIComponent(nodeId)}/repair/propose`, { method: 'POST', body: '{}' });
  }

  async getUsage() {
    const [summary, daily, analytics] = await Promise.all([
      this.request<any>('/usage/summary'),
      this.request<any>('/usage/daily'),
      this.request<any>('/usage/analytics'),
    ]);
    return { summary, daily, analytics };
  }

  async getAudit() {
    const result = await this.request<{ logs: any[] }>('/audit');
    return result.logs || [];
  }

  async getObjectives() {
    const result = await this.request<{ objectives: any[] }>('/autonomous-objectives');
    return result.objectives || [];
  }

  async getProjectTree(projectId: string) {
    const result = await this.request<{ files: any[] }>(`/workspace/projects/${encodeURIComponent(projectId)}/tree`);
    return result.files || [];
  }

  async getProjectFile(projectId: string, path: string) {
    return this.request<{ file: any }>(`/workspace/projects/${encodeURIComponent(projectId)}/files/${path.split('/').map(encodeURIComponent).join('/')}`);
  }

  async searchProject(projectId: string, q: string) {
    return this.request<{ query: string; matches: any[] }>(`/workspace/projects/${encodeURIComponent(projectId)}/search?q=${encodeURIComponent(q)}`);
  }

  async openGitHubConnect() {
    return this.request<{ authorizationUrl: string }>('/github/connect');
  }

  async getGitHubRepositories() {
    const result = await this.request<{ repositories: any[] }>('/github/repos');
    return result.repositories || [];
  }

  async openGoogleConnect() {
    return this.request<{ authorizationUrl: string }>('/google/connect');
  }

  async getGmail() {
    return this.request('/google/gmail/messages?maxResults=20');
  }

  async getDrive() {
    return this.request('/google/drive/files?pageSize=20');
  }

  async getCalendar() {
    return this.request('/google/calendar/events?maxResults=20');
  }

  async openOriginConnect() {
    return this.request<{ authorizationUrl: string }>('/origin/connect');
  }

  async getOriginRepositories() {
    const result = await this.request<{ repositories: any[] }>('/origin/repos');
    return result.repositories || [];
  }

  async generateCode(prompt: string, projectId?: string) {
    return this.request('/code/generate', { method: 'POST', body: JSON.stringify({ prompt, projectId }) });
  }

  async getRuntimes() {
    return this.request('/runtimes?capability=command.exec');
  }

  async getRecoverableRuntimes() {
    return this.request('/runtimes/recoverable');
  }
}

export function createEngineApi(baseUrl: string, apiKey: string): EngineApi {
  return new EngineApi(baseUrl.trim() || DEFAULT_BASE, apiKey.trim());
}

export function defaultEngineUrl(): string {
  return DEFAULT_BASE;
}
