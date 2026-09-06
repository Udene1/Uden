import { Hono } from 'hono';
import { HonoEnv } from '../types';
import { executeTask, runTaskExecution } from '../services/executor';
import { createTaskGraph, decomposeTask } from '../services/task-graph';
import { executeTaskGraph, resumeTaskGraph } from '../services/graph-executor';
import { getPersistedGraph, listPersistedGraphs, listGraphAttempts } from '../services/graph-persistence';
import { listTasks, getTask, updateTask } from '../db/queries';

export const taskRoutes = new Hono<HonoEnv>();

taskRoutes.post('/', async c => {
  const b = await c.req.json().catch(() => ({}));
  const t = c.get('tenantId');
  if (!b.prompt || typeof b.prompt !== 'string' || !b.prompt.trim()) return c.json({ error: 'Prompt is required and must be a non-empty string' }, 400);
  try { return c.json(await executeTask(c.env, t, b.prompt, b.mode !== 'permission-based' && b.permissionless !== false, b.projectId), 200); }
  catch (e: any) { return c.json({ error: e.message || 'Internal server error' }, e.message === 'Budget exceeded' ? 402 : 500); }
});

taskRoutes.post('/plan', async c => {
  const b = await c.req.json().catch(() => ({}));
  if (!b.prompt || typeof b.prompt !== 'string' || !b.prompt.trim()) return c.json({ error: 'Prompt is required and must be a non-empty string' }, 400);
  const plan = decomposeTask(b.prompt.trim());
  return c.json({ plan, graph: createTaskGraph(crypto.randomUUID(), plan) }, 200);
});

taskRoutes.post('/graph/execute', async c => {
  const b = await c.req.json().catch(() => ({}));
  const t = c.get('tenantId');
  if (b.plan !== undefined && (!b.plan || typeof b.plan !== 'object')) return c.json({ error: 'plan must be an object when supplied' }, 400);
  if (!b.prompt && !b.plan) return c.json({ error: 'Prompt or plan is required' }, 400);
  try {
    const plan = b.plan || decomposeTask(String(b.prompt).trim());
    if (!plan.goal || !Array.isArray(plan.nodes)) return c.json({ error: 'Invalid task graph plan' }, 400);
    return c.json(await executeTaskGraph(c.env, t, plan, b.projectId), 200);
  } catch (e: any) {
    if (e.message === 'Budget exceeded') return c.json({ error: e.message }, 402);
    if (String(e.message).startsWith('Invalid graph:')) return c.json({ error: e.message }, 400);
    return c.json({ error: e.message || 'Graph execution failed' }, 500);
  }
});

taskRoutes.post('/graph/:id/resume', async c => {
  try { return c.json(await resumeTaskGraph(c.env, c.get('tenantId'), c.req.param('id')), 200); }
  catch (e: any) {
    if (e.message === 'Graph not found') return c.json({ error: e.message }, 404);
    if (e.message === 'Graph is currently owned by another execution') return c.json({ error: e.message }, 409);
    return c.json({ error: e.message || 'Graph resume failed' }, 500);
  }
});

taskRoutes.get('/graphs', async c => {
  const t = c.get('tenantId');
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') || 50)));
  const offset = Math.max(0, Number(c.req.query('offset') || 0));
  return c.json({ graphs: await listPersistedGraphs(c.env.DB, t, limit, offset) }, 200);
});

taskRoutes.get('/graph/:id', async c => {
  const graph = await getPersistedGraph(c.env.DB, c.get('tenantId'), c.req.param('id'));
  return graph ? c.json({ graph }, 200) : c.json({ error: 'Graph not found' }, 404);
});

taskRoutes.get('/graph/:id/attempts', async c => c.json({ attempts: await listGraphAttempts(c.env.DB, c.get('tenantId'), c.req.param('id'), c.req.query('nodeId')) }, 200));

taskRoutes.get('/', async c => {
  const t = c.get('tenantId');
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50', 10)));
  const offset = Math.max(0, parseInt(c.req.query('offset') || '0', 10));
  return c.json({ tasks: await listTasks(c.env.DB, t, limit, offset) });
});

taskRoutes.get('/:id', async c => {
  const task = await getTask(c.env.DB, c.req.param('id'), c.get('tenantId'));
  return task ? c.json({ task }) : c.json({ error: 'Not found' }, 404);
});

taskRoutes.post('/:id/approve', async c => {
  const t = c.get('tenantId'), id = c.req.param('id'), b = await c.req.json().catch(() => ({}));
  const task = await getTask(c.env.DB, id, t);
  if (!task) return c.json({ error: 'Not found' }, 404);
  if (task.status !== 'awaiting-approval') return c.json({ error: `Task status is '${task.status}', cannot approve` }, 400);
  await updateTask(c.env.DB, id, t, { status: 'processing' });
  try { return c.json(await runTaskExecution(c.env, task, b.primaryModel || task.routingPlan?.primaryModel || task.proposal?.suggestedModel || 'gpt-4o-mini', b.fallbackChain || task.routingPlan?.fallbackChain || [], task.expectedFormat || 'markdown'), 200); }
  catch (e: any) { return c.json({ error: e.message || 'Execution failed' }, 500); }
});
