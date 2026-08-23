import { Hono } from 'hono';
import { HonoEnv } from '../types';
import { executeTask, runTaskExecution } from '../services/executor';
import { listTasks, getTask, updateTask } from '../db/queries';

export const taskRoutes = new Hono<HonoEnv>();

taskRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const tenantId = c.get('tenantId');

  if (!body.prompt) {
    return c.json({ error: 'Prompt is required' }, 400);
  }

  try {
    const isPermissionless = body.mode !== 'permission-based' && body.permissionless !== false;
    const result = await executeTask(c.env, tenantId, body.prompt, isPermissionless, body.projectId);
    return c.json(result, 200);
  } catch (err: any) {
    if (err.message === 'Budget exceeded') {
      return c.json({ error: err.message }, 402);
    }
    return c.json({ error: err.message }, 500);
  }
});

taskRoutes.get('/', async (c) => {
  const tenantId = c.get('tenantId');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

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
    return c.json({ error: 'Task is not awaiting approval' }, 400);
  }

  await updateTask(c.env.DB, id, tenantId, { status: 'processing' });

  const primaryModel = body.primaryModel || task.proposal?.suggestedModel || 'gpt-4o-mini';
  const fallbackChain = body.fallbackChain || ['gemini-2.5-flash', 'claude-haiku'];
  const expectedFormat = task.expectedFormat || 'text';

  try {
    const result = await runTaskExecution(c.env, task, primaryModel, fallbackChain, expectedFormat);
    return c.json(result, 200);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});
