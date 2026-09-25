export type TaskStatus = 'pending' | 'classifying' | 'routing' | 'processing' | 'quality-check' | 'escalating' | 'completed' | 'failed' | 'awaiting-approval' | 'approved' | 'rejected';

export interface Task { id:string; prompt:string; status:TaskStatus; mode?:'permissionless'|'permission-based'; output?:string; totalCostCents:number; modelUsed?:string; qualityScore?:number; createdAt:string; completedAt?:string; }
export interface Tenant { id:string; name:string; email:string; }
export interface AuthResult { sessionToken:string; tenant:Tenant; }

export class EngineApi {
  constructor(private readonly baseUrl:string, private readonly token:string) {}
  private async request<T>(path:string,init:RequestInit={}):Promise<T>{
    const response=await fetch(`${this.baseUrl.replace(/\/$/,'')}${path}`,{...init,headers:{Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${this.token}`,...(init.headers??{})}});
    const body=await response.text(); let parsed:unknown=null; try{parsed=body?JSON.parse(body):null;}catch{parsed=body;}
    if(!response.ok){const message=typeof parsed==='object'&&parsed&&'error' in parsed?String((parsed as {error:unknown}).error):`Engine request failed (${response.status}).`;throw new Error(message);}
    return parsed as T;
  }
  static async signIn(baseUrl:string,email:string,password:string){return EngineApi.authenticate(baseUrl,'/auth/login',{email,password});}
  static async signUp(baseUrl:string,name:string,email:string,password:string){return EngineApi.authenticate(baseUrl,'/auth/register',{name,email,password});}
  private static async authenticate(baseUrl:string,path:string,payload:Record<string,string>):Promise<AuthResult>{
    const response=await fetch(`${baseUrl.replace(/\/$/,'')}${path}`,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify(payload)});
    const body=await response.text(); let parsed:any=null; try{parsed=body?JSON.parse(body):null;}catch{}
    if(!response.ok)throw new Error(parsed?.error||`Authentication failed (${response.status}).`);
    return {sessionToken:parsed.session_token,tenant:parsed.tenant};
  }
  async getTenant(){return this.request<{tenant:Tenant}>('/auth/me');}
  async logout(){return this.request<{success:boolean}>('/auth/logout',{method:'POST'});}
  getTasks(){return this.request<Task[]>('/tasks');}
  getTask(id:string){return this.request<Task>(`/tasks/${encodeURIComponent(id)}`);}
  createTask(prompt:string,mode:Task['mode']='permissionless'){return this.request<Task>('/tasks',{method:'POST',body:JSON.stringify({prompt,mode})});}
  approveTask(id:string){return this.request<Task>(`/tasks/${encodeURIComponent(id)}/approve`,{method:'POST',body:JSON.stringify({})});}
}
export const defaultEngineUrl=()=>import.meta.env.VITE_ENGINE_URL||'/api/v1';
