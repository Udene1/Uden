import { Hono } from 'hono';
import { HonoEnv } from '../types';
import { executeTask, runTaskExecution } from '../services/executor';
import { createTaskGraph, decomposeTask } from '../services/task-graph';
import { executeTaskGraph } from '../services/graph-executor';
import { getPersistedGraph, listPersistedGraphs, listGraphAttempts } from '../services/graph-persistence';
import { listTasks, getTask, updateTask } from '../db/queries';

export const taskRoutes = new Hono<HonoEnv>();

taskRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const tenantId = c.get('tenantId');
  if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim().length === 0) return c.json({ error: 'Prompt is required and must be a non-empty string' }, 400);
  try { const isPermissionless = body.mode !== 'permission-based' && body.permissionless !== false; return c.json(await executeTask(c.env, tenantId, body.prompt, isPermissionless, body.projectId), 200); }
  catch (err:any) { if(err.message==='Budget exceeded') return c.json({error:err.message},402); return c.json({error:err.message||'Internal server error'},500); }
});

taskRoutes.post('/plan', async (c) => {
  const body=await c.req.json().catch(()=>({}));
  if(!body.prompt||typeof body.prompt!=='string'||!body.prompt.trim()) return c.json({error:'Prompt is required and must be a non-empty string'},400);
  const plan=decomposeTask(body.prompt.trim()); return c.json({plan,graph:createTaskGraph(crypto.randomUUID(),plan)},200);
});

taskRoutes.post('/graph/execute', async (c) => {
  const body=await c.req.json().catch(()=>({})); const tenantId=c.get('tenantId');
  if(body.plan!==undefined&&(!body.plan||typeof body.plan!=='object')) return c.json({error:'plan must be an object when supplied'},400);
  if(!body.prompt&&!body.plan) return c.json({error:'Prompt or plan is required'},400);
  try { const plan=body.plan||decomposeTask(String(body.prompt).trim()); if(!plan.goal||!Array.isArray(plan.nodes)) return c.json({error:'Invalid task graph plan'},400); const result=await executeTaskGraph(c.env,tenantId,plan,body.projectId); return c.json(result,200); }
  catch(err:any){if(err.message==='Budget exceeded')return c.json({error:err.message},402);if(String(err.message).startsWith('Invalid graph:'))return c.json({error:err.message},400);return c.json({error:err.message||'Graph execution failed'},500);}
});

// Durable graph reads are always tenant-scoped by the authenticated middleware.
taskRoutes.get('/graphs', async (c) => {
  const tenantId=c.get('tenantId'); const limit=Math.min(100,Math.max(1,Number(c.req.query('limit')||50))); const offset=Math.max(0,Number(c.req.query('offset')||0));
  return c.json({graphs:await listPersistedGraphs(c.env.DB,tenantId,limit,offset)},200);
});
taskRoutes.get('/graph/:id', async (c) => {
  const graph=await getPersistedGraph(c.env.DB,c.get('tenantId'),c.req.param('id')); if(!graph)return c.json({error:'Graph not found'},404); return c.json({graph},200);
});
taskRoutes.get('/graph/:id/attempts', async (c) => {
  const attempts=await listGraphAttempts(c.env.DB,c.get('tenantId'),c.req.param('id'),c.req.query('nodeId')); return c.json({attempts},200);
});

taskRoutes.get('/', async (c) => { const tenantId=c.get('tenantId'); const limit=Math.min(100,Math.max(1,parseInt(c.req.query('limit')||'50',10))); const offset=Math.max(0,parseInt(c.req.query('offset')||'0',10)); return c.json({tasks:await listTasks(c.env.DB,tenantId,limit,offset)}); });

taskRoutes.get('/:id', async (c) => { const task=await getTask(c.env.DB,c.req.param('id'),c.get('tenantId')); if(!task)return c.json({error:'Not found'},404); return c.json({task}); });

taskRoutes.post('/:id/approve', async (c) => {
 const tenantId=c.get('tenantId'),id=c.req.param('id'),body=await c.req.json().catch(()=>({})); const task=await getTask(c.env.DB,id,tenantId);
 if(!task)return c.json({error:'Not found'},404); if(task.status!=='awaiting-approval')return c.json({error:`Task status is '${task.status}', cannot approve`},400);
 await updateTask(c.env.DB,id,tenantId,{status:'processing'}); const primaryModel=body.primaryModel||task.routingPlan?.primaryModel||task.proposal?.suggestedModel||'gpt-4o-mini'; const fallbackChain=body.fallbackChain||task.routingPlan?.fallbackChain||[]; const expectedFormat=task.expectedFormat||'markdown';
 try{return c.json(await runTaskExecution(c.env,task,primaryModel,fallbackChain,expectedFormat),200);}catch(err:any){return c.json({error:err.message||'Execution failed'},500);}
});
