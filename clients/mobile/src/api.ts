import { DEFAULT_ENGINE_URL } from '@ai-work-partner/shared';
export type TaskStatus = 'pending'|'classifying'|'routing'|'processing'|'quality-check'|'escalating'|'completed'|'failed'|'awaiting-approval'|'approved'|'rejected';
export type TaskMode = 'permissionless'|'permission-based';
export interface Tenant { id:string; name:string; email?:string; qualityPreference?:string; monthlyBudgetCents?:number; defaultMode?:TaskMode; }
export interface Task { id:string; prompt:string; status:TaskStatus; mode:TaskMode; projectId?:string; output?:string; totalCostCents:number; modelUsed?:string; qualityScore?:number; createdAt:string; completedAt?:string; }

const DEFAULT_BASE = process.env.EXPO_PUBLIC_ENGINE_URL || `${DEFAULT_ENGINE_URL}/api/v1`;

export class EngineApi {
  constructor(private readonly baseUrl:string, private readonly credential:string) {}

  static async fromApiKey(baseUrl:string, apiKey:string):Promise<EngineApi> {
    const response=await fetch(`${baseUrl.replace(/\/$/,'')}/auth/session`,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({apiKey,client:'mobile'})});
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(body?.error||`Engine authentication failed (${response.status})`);
    return new EngineApi(baseUrl,body.session_token as string);
  }

  private async request<T>(path:string,options:RequestInit={}):Promise<T>{
    const response=await fetch(`${this.baseUrl.replace(/\/$/,'')}${path}`,{...options,headers:{Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${this.credential}`,...(options.headers||{})}});
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(body?.error||`Engine request failed (${response.status})`);
    return body as T;
  }

  async registerTenant(name:string,email=''):Promise<{tenant:Tenant;api_key:string}>{return this.request('/tenants',{method:'POST',body:JSON.stringify({name,email})});}
  async getTenant():Promise<Tenant>{const result=await this.request<{tenant:Tenant}>('/tenant');return result.tenant;}
  async createTask(prompt:string,mode:TaskMode='permissionless'):Promise<Task>{return this.request('/tasks',{method:'POST',body:JSON.stringify({prompt,mode})});}
  async getTasks():Promise<Task[]>{const result=await this.request<{tasks:Task[]}>('/tasks');return result.tasks||[];}
  async getTask(id:string):Promise<Task>{const result=await this.request<{task:Task}>(`/tasks/${id}`);return result.task;}
  async approveTask(id:string):Promise<Task>{return this.request(`/tasks/${id}/approve`,{method:'POST',body:'{}'});}
}
export function createEngineApi(baseUrl:string,credential:string):EngineApi{return new EngineApi(baseUrl.trim()||DEFAULT_BASE,credential.trim());}
export function defaultEngineUrl():string{return DEFAULT_BASE;}
