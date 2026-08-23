// Mock types until @ai-work-partner/shared is available
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'requires_approval';
export type TaskMode = 'permissionless' | 'permission_based';

export interface Tenant {
  id: string;
  name: string;
  apiKey: string;
  settings: {
    monthlyBudgetCents: number;
    defaultMode: TaskMode;
  };
}

export interface Task {
  id: string;
  prompt: string;
  status: TaskStatus;
  mode: TaskMode;
  projectId?: string;
  result?: string;
  costCents: number;
  model: string;
  qualityScore?: number;
  createdAt: string;
  completedAt?: string;
}

export interface UsageSummary {
  totalSpendCents: number;
  budgetCents: number;
  tasksCompleted: number;
  escalationRate: number;
  savingsCents: number;
}

class ApiClient {
  private async fetcher<T>(endpoint: string, options: RequestInit = {}, apiKey?: string): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Default to mock data if the API fails during initial UI building
    try {
      const response = await fetch(`/api/backend${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.warn(`API call to ${endpoint} failed, using mock data for development.`);
      return this.getMockData(endpoint) as unknown as T;
    }
  }

  // --- MOCK DATA ---
  private getMockData(endpoint: string) {
    if (endpoint.startsWith('/tenant')) {
      return { id: 't-123', name: 'Demo Company', apiKey: 'test-key', settings: { monthlyBudgetCents: 50000, defaultMode: 'permissionless' } };
    }
    if (endpoint.startsWith('/usage/summary')) {
      return { totalSpendCents: 12500, budgetCents: 50000, tasksCompleted: 142, escalationRate: 0.05, savingsCents: 4500 };
    }
    if (endpoint.startsWith('/tasks/')) {
      return { id: 'task-1', prompt: 'Refactor login component', status: 'completed', mode: 'permissionless', costCents: 12, model: 'gpt-4o', qualityScore: 95, createdAt: new Date().toISOString() };
    }
    if (endpoint.startsWith('/tasks')) {
      return {
        data: Array.from({ length: 10 }).map((_, i) => ({
          id: `task-${i}`, prompt: `Task description ${i}`, status: i % 3 === 0 ? 'requires_approval' : 'completed',
          mode: 'permissionless', costCents: Math.floor(Math.random() * 50) + 1, model: i % 2 === 0 ? 'claude-3.5-sonnet' : 'gpt-4o',
          createdAt: new Date().toISOString()
        })),
        total: 10,
        page: 1,
        totalPages: 1
      };
    }
    return {};
  }

  // API Methods
  async registerTenant(name: string): Promise<{ apiKey: string }> {
    return this.fetcher('/tenants', { method: 'POST', body: JSON.stringify({ name }) });
  }

  async getCurrentTenant(apiKey: string): Promise<Tenant> {
    return this.fetcher('/tenant', {}, apiKey);
  }

  async getUsageSummary(apiKey?: string): Promise<UsageSummary> {
    return this.fetcher('/usage/summary', {}, apiKey);
  }

  async getTasks(apiKey?: string, filters?: { status?: string }): Promise<{ data: Task[], total: number }> {
    const qs = filters?.status ? `?status=${filters.status}` : '';
    return this.fetcher(`/tasks${qs}`, {}, apiKey);
  }
  
  async getTask(id: string, apiKey?: string): Promise<Task> {
    return this.fetcher(`/tasks/${id}`, {}, apiKey);
  }
  
  async createTask(prompt: string, mode?: TaskMode, projectId?: string, apiKey?: string): Promise<Task> {
    return this.fetcher('/tasks', { method: 'POST', body: JSON.stringify({ prompt, mode, projectId }) }, apiKey);
  }
}

export const api = new ApiClient();
