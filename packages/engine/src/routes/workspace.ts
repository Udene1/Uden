import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { listProjectFiles, searchProjectFiles, upsertProjectFile, runProjectCommand } from '../services/project-runtime';
import { requirePermission, writeAudit } from '../services/permissions';
import { sanitizeError } from '../services/observability';

export const workspaceRoutes = new Hono<HonoEnv>();

workspaceRoutes.get('/projects/:projectId/files', async c => {
  const tenantId = c.get('tenantId'); const projectId = c.req.param('projectId');
  try { await requirePermission(c.env.DB, tenantId, 'project:read'); return c.json({ files: await listProjectFiles(c.env, tenantId, projectId) }, 200); }
  catch (error) { const message = sanitizeError(error); return c.json({ error: message }, message === 'Forbidden' ? 403 : 400); }
});

workspaceRoutes.get('/projects/:projectId/search', async c => {
  const tenantId = c.get('tenantId'); const projectId = c.req.param('projectId');
  try {
    await requirePermission(c.env.DB, tenantId, 'project:read');
    const query = c.req.query('q');
    if (!query) return c.json({ error: 'q is required' }, 400);
    return c.json({ query, matches: await searchProjectFiles(c.env, tenantId, projectId, query) }, 200);
  } catch (error) { const message = sanitizeError(error); return c.json({ error: message }, message === 'Forbidden' ? 403 : 400); }
});

workspaceRoutes.put('/projects/:projectId/files', async c => {
  const tenantId = c.get('tenantId'); const projectId = c.req.param('projectId');
  try {
    await requirePermission(c.env.DB, tenantId, 'project:write');
    const body = await c.req.json().catch(() => ({}));
    if (!body || typeof body.path !== 'string' || typeof body.content !== 'string') return c.json({ error: 'path and content are required' }, 400);
    const file = await upsertProjectFile(c.env, tenantId, projectId, body.path, body.content, typeof body.expectedVersion === 'number' ? body.expectedVersion : undefined);
    await writeAudit(c.env.DB, tenantId, 'project.file.write', 'project_file', `${projectId}:${file.path}`, undefined, c.get('requestId'), { projectId, path: file.path, version: file.version });
    return c.json({ file }, 200);
  } catch (error) { const message = sanitizeError(error); return c.json({ error: message }, message === 'Forbidden' ? 403 : 409); }
});

workspaceRoutes.post('/projects/:projectId/run', async c => {
  const tenantId = c.get('tenantId'); const projectId = c.req.param('projectId');
  try {
    await requirePermission(c.env.DB, tenantId, 'project:execute');
    const body = await c.req.json().catch(() => ({}));
    if (!body || typeof body.command !== 'string') return c.json({ error: 'command is required' }, 400);
    const files = await listProjectFiles(c.env, tenantId, projectId);
    const result = await runProjectCommand(c.env, tenantId, projectId, body.command, files);
    await c.env.DB.prepare('INSERT INTO project_runtime_jobs (id,tenant_id,project_id,command,status,exit_code,output,started_at,completed_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(result.jobId, tenantId, projectId, body.command.trim(), result.status, result.exitCode ?? null, result.output ?? null, result.status === 'running' || result.status === 'succeeded' || result.status === 'failed' ? new Date().toISOString() : null, result.status === 'succeeded' || result.status === 'failed' ? new Date().toISOString() : null).run();
    await writeAudit(c.env.DB, tenantId, 'project.runtime.execute', 'project_runtime_job', result.jobId, undefined, c.get('requestId'), { projectId, command: body.command.trim(), status: result.status });
    return c.json(result, 202);
  } catch (error) { const message = sanitizeError(error); return c.json({ error: message }, message === 'Forbidden' ? 403 : 502); }
});
