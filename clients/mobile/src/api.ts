export type TaskStatus='pending'|'classifying'|'routing'|'processing'|'quality-check'|'escalating'|'completed'|'failed'|'awaiting-approval'|'approved'|'rejected';
export type TaskMode='permissionless'|'permission-based';
export interface Tenant{id:string;name:string;email?:string;qualityPreference?:string;monthlyBudgetCents?:number;defaultMode?:TaskMode;}
export interface Task{id:string;prompt:string;status:TaskStatus;mode:TaskMode;projectId?:string;output?:string;totalCostCents:number;modelUsed?:string;qualityScore?:number;createdAt:string;completedAt?:string;}
export interface AuthResult{sessionToken:string;tenant:Tenant;}
const DEFAULT_BASE=process.env.EXPO_PUBLIC_ENGINE_URL||'http://localhost:8787/api/v1';
export class EngineApi{
  constructor(private readonly baseUrl:string,private readonly token:string){}
  private async request<T>(path:string,options:RequestInit={}):Promise<T>{const response=await fetch(`${this.baseUrl.replace(/\/$/,'')}${path}`,{...options,headers:{Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${this.token}`,...(options.headers||{})}});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body?.error||`Engine request failed (${response.status})`);return body as T;}
  static async signIn(baseUrl:string,email:string,password:string):Promise<AuthResult>{return this.authenticate(baseUrl,'/auth/login',{email,password});}
  static async signUp(baseUrl:string,name:string,email:string,password:string):Promise<AuthResult>{return this.authenticate(baseUrl,'/auth/register',{name,email,password});}
  private static async authenticate(baseUrl:string,path:string,payload:Record<string,string>):Promise<AuthResult>{const response=await fetch(`${baseUrl.replace(/\/$/,'')}${path}`,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify(payload)});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body?.error||`Authentication failed (${response.status})`);return {sessionToken:body.session_token,tenant:body.tenant};}
  async getTenant():Promise<Tenant>{return (await this.request<{tenant:Tenant}>('/auth/me')).tenant;}
  async logout(){return this.request<{success:boolean}>('/auth/logout',{method:'POST'});}
  async createTask(prompt:string,mode:TaskMode='permissionless'):Promise<Task>{return this.request<Task>('/tasks',{method:'POST',body:JSON.stringify({prompt,mode})});}
  async getTasks():Promise<Task[]>{const result=await this.request<{tasks:Task[]}>('/tasks');return result.tasks||[];}
  async getTask(id:string):Promise<Task>{return (await this.request<{task:Task}>(`/tasks/${id}`)).task;}
  async approveTask(id:string):Promise<Task>{return this.request<Task>(`/tasks/${id}/approve`,{method:'POST',body:'{}'});}
}
export function createEngineApi(baseUrl:string,token:string){return new EngineApi(baseUrl.trim()||DEFAULT_BASE,token.trim());}
export function defaultEngineUrl(){return DEFAULT_BASE;}
