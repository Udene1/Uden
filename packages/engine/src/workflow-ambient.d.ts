declare module 'cloudflare:workers' {
  export class WorkflowEntrypoint<Env = unknown, Params = unknown> {
    protected readonly env: Env;
    constructor(ctx: ExecutionContext, env: Env);
  }

  export interface WorkflowEvent<Params = unknown> {
    payload: Params;
    instanceId: string;
    timestamp: number;
    schedule?: { cron: string; scheduledTime: number };
  }

  export interface WorkflowStepContext {
    step: { name: string; count: number };
    attempt: number;
    config: unknown;
  }

  export interface WorkflowStep {
    do<T>(name: string, callback: (context: WorkflowStepContext) => Promise<T>): Promise<T>;
    do<T>(name: string, options: unknown, callback: (context: WorkflowStepContext) => Promise<T>): Promise<T>;
    sleep(name: string, duration: string | number): Promise<void>;
  }
}
