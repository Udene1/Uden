export type TaskStatus = 'pending' | 'classifying' | 'routing' | 'processing' | 'quality-check' | 'escalating' | 'completed' | 'failed' | 'awaiting-approval' | 'approved' | 'rejected';
export type TaskMode = 'permissionless' | 'permission-based';
export interface Tenant { id:string; name:string; apiKey?:string; settings:{monthlyBudgetCents:number; defaultMode:TaskMode}; }
export interface Task { id:string; prompt:string; status:TaskStatus; mode:TaskMode; projectId?:string; output?:string; totalCostCents:number; modelUsed?:string; qualityScore?:number; createdAt:string; completedAt?:string; }
export interface UsageSummary { totalCostCents:number; totalTokensIn:number; totalTokensOut:number; totalTasks:number; completedTasks:number; failedTasks:number; escalationCount:number; escalationRate:number; averageQualityScore:number; costByModel:Record<string,number>; costByProvider:Record<string,number>; savingsEstimateCents:number; budgetUsedPercent:number; }
export interface GraphAnalytics { totals:Record<string,number>; escalation:Record<string,number>; byDomain:Array<Record<string,any>>; byModel:Array<Record<string,any>>; recentGraphs:Array<Record<string,any>>; }
export interface AnalyticsResponse { analytics:GraphAnalytics; savings:{actualCostCents:number;primaryAttemptCostCents:number;escalationCostCents:number;routingSavingsCents:number}; }
class ApiClient {
 private base=process.env.NEXT_PUBLIC_ENGINE_URL||'/api/v1';
 private async fetcher<T>(endpoint:string,options:RequestInit={},apiKey?:string):Promise<T>{const headers:Record<string,string>={'Content-Type':'application/json'};if(apiKey)headers.Authorization=`Bearer ${apiKey}`;const response=await fetch(`${this.base}${endpoint}`,{...options,headers:{...headers,...(options.headers as Record<string,string>|undefined)}});if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error||`API Error: ${response.status}`);}return response.json();}
 async registerTenant(name:string):Promise<{apiKey:string}>{return this.fetcher('/tenants',{method:'POST',body:JSON.stringify({name})});}
 async getCurrentTenant(apiKey:string):Promise<Tenant>{return this.fetcher('/tenant',{},apiKey);}
 async getUsageSummary(apiKey?:string):Promise<UsageSummary>{return this.fetcher('/usage/summary',{},apiKey);}
 async getDailyUsage(apiKey?:string){return this.fetcher<{daily:Array<{date:string;cost_cents:number;task_count:number;tokens_in:number;tokens_out:number}>}>('/usage/daily',{},apiKey);}
 async getAnalytics(apiKey?:string):Promise<AnalyticsResponse>{return this.fetcher('/usage/analytics',{},apiKey);}
 async getTasks(apiKey?:string,filters?:{status?:string}):Promise<{data:Task[],total:number}>{const qs=filters?.status?`?status=${encodeURIComponent(filters.status)}`:'';const result=await this.fetcher<{tasks:Task[]}>('/tasks'+qs,{},apiKey);return {data:result.tasks||[],total:(result.tasks||[]).length};}
 async getTask(id:string,apiKey?:string):Promise<Task>{const result=await this.fetcher<{task:Task}>(`/tasks/${id}`,{},apiKey);return result.task;}
 async createTask(prompt:string,mode?:TaskMode,projectId?:string,apiKey?:string):Promise<Task>{return this.fetcher('/tasks',{method:'POST',body:JSON.stringify({prompt,mode,projectId})},apiKey);}
}
export const api=new ApiClient();
