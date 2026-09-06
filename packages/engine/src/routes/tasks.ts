import { Hono } from 'hono';
import { HonoEnv } from '../types';
import { executeTask, runTaskExecution } from '../services/executor';
import { createTaskGraph, decomposeTask } from '../services/task-graph';
import { listTasks, getTask, updateTask } from '../db/queries';

export const taskRoutes = new Hono<HonoEnv>();

taskRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const tenantId = c.get('tenantId');

  if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
    return c.json({ error: 'Prompt is required and must be a non-empty string' }, 400);
  }

  try {
    const isPermissionless = body.mode !== 'permission-based' && body.permissionless !== false;
    const result = await executeTask(c.env, tenantId, body.prompt, isPermissionless, body.projectId);
    return c.json(result, 200);
  } catch (err: any) {
    if (err.message === 'Budget exceeded') {
      return c.json({ error: err.message }, 402);
    }
    return c.json({ error: err.message || 'Internal server error' }, 500);
  }
});

/**
 * Preview the work graph without spending model credits or mutating task state.
 * This gives the dashboard/client a safe way to inspect decomposition before
 * graph execution is wired into the executor.
 */
taskRoutes.post('/plan', async (c) => {
  const body = await c.req.json().catch(() => ({}));

  if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
    return c.json({ error: 'Prompt is required and must be a non-empty string' }, 400);
  }

  const plan = decomposeTask(body.prompt.trim());
  const graph = createTaskGraph(crypto.randomUUID(), plan);

  return c.json({ plan, graph }, 200);
});

taskRoutes.get('/', async (c) => {
  const tenantId = c.get('tenantId');
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50', 10)));
  const offset = Math.max(0, parseInt(c.req.query('offset') || '0', 10));

  const tasks = await listTasks(c.env.DB, tenantId, limit, offset);
  return c.json({ tasks });
});

taskRoutes.get('/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');
  const task = await getTask(c.env.DB, id, tenantId);

  if (!task) return c.json({ error: 'Not found' }, 404);
  return c.json({ task });
});

taskRoutes.post('/:id/approve', async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  const task = await getTask(c.env.DB, id, tenantId);

  if (!task) return c.json({ error: 'Not found' }, 404);
  if (task.status !== 'awaiting-approval') {
    return c.json({ error: `Task status is '${task.status}', cannot approve` }, 400);
  }

  await updateTask(c.env.DB, id, tenantId, { status: 'processing' });

  // Use the persisted routing plan from the original proposal
  const primaryModel = body.primaryModel ||
    task.routingPlan?.primaryModel ||
    task.proposal?.suggestedModel ||
    'gpt-4o-mini';

  const fallbackChain = body.fallbackChain ||
    task.routingPlan?.fallbackChain ||
    [];

  const expectedFormat = task.expectedFormat || 'markdown';

  try {
    const result = await runTaskExecution(c.env, task, primaryModel, fallbackChain, expectedFormat);
    return c.json(result, 200);
  } catch (err: any) {
    return c.json({ error: err.message || 'Execution failed' }, 500);
  }
});
