import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { requirePermission, writeAudit } from '../services/permissions';
import { createAutonomousObjective, getAutonomousObjective, listAutonomousObjectives } from '../services/autonomous-objectives';
import { sanitizeError } from '../services/observability';

export const autonomousObjectiveRoutes = new Hono<HonoEnv>();

autonomousObjectiveRoutes.post('/', async c => {
  const tenantId = c.get('tenantId');
  try {
    await requirePermission(c.env.DB, tenantId, 'graph:execute');
    const body = await c.req.json();
    const objective = await createAutonomousObjective(c.env, tenantId, body);
    await writeAudit(c.env.DB, tenantId, 'autonomous_objective.created', 'autonomous_objective', objective.id, undefined, c.get('requestId'), { objectiveId: objective.id });
    return c.json({ objective }, 201);
  } catch (error) { const message = sanitizeError(error); return c.json({ error: message }, message === 'Forbidden' ? 403 : 400); }
});

autonomousObjectiveRoutes.get('/', async c => {
  const tenantId = c.get('tenantId');
  try { await requirePermission(c.env.DB, tenantId, 'graph:read'); return c.json({ objectives: await listAutonomousObjectives(c.env, tenantId) }); }
  catch (error) { const message = sanitizeError(error); return c.json({ error: message }, message === 'Forbidden' ? 403 : 400); }
});

autonomousObjectiveRoutes.get('/:objectiveId', async c => {
  const tenantId = c.get('tenantId');
  try {
    await requirePermission(c.env.DB, tenantId, 'graph:read');
    const objective = await getAutonomousObjective(c.env, tenantId, c.req.param('objectiveId'));
    if (!objective) return c.json({ error: 'Objective not found' }, 404);
    return c.json({ objective });
  } catch (error) { const message = sanitizeError(error); return c.json({ error: message }, message === 'Forbidden' ? 403 : 400); }
});
