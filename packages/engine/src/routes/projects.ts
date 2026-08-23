import { Hono } from 'hono';
import { HonoEnv } from '../types';
import { createProject, getProjects } from '../db/queries';
import { Project } from '@ai-work-partner/shared';

export const projectRoutes = new Hono<HonoEnv>();

projectRoutes.post('/', async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json();

  if (!body.name) return c.json({ error: 'Name is required' }, 400);

  const now = new Date().toISOString();
  const project: Project = {
    id: crypto.randomUUID(),
    tenantId,
    name: body.name,
    description: body.description || '',
    createdAt: now,
    updatedAt: now
  };

  await createProject(c.env.DB, project);
  return c.json({ project }, 201);
});

projectRoutes.get('/', async (c) => {
  const tenantId = c.get('tenantId');
  const projects = await getProjects(c.env.DB, tenantId);
  return c.json({ projects });
});
