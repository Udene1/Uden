import { Hono } from 'hono';
import type { Context } from 'hono';
import type { HonoEnv } from '../types';
import { requirePermission } from '../services/permissions';
import { sanitizeError } from '../services/observability';
import { readGitHubObjectsBatch, type GitHubBatchObject } from '../services/github-batch';

export const githubBatchRoutes = new Hono<HonoEnv>();

function repoParams(c: Context<HonoEnv>): { owner: string; repo: string } {
  const owner = c.req.param('owner');
  const repo = c.req.param('repo');
  if (!owner || !repo) throw new Error('GitHub repository owner and name are required');
  return { owner, repo };
}

githubBatchRoutes.post('/repos/:owner/:repo/objects/batch', async c => {
  const tenantId = c.get('tenantId');
  try {
    await requirePermission(c.env.DB, tenantId, 'github:read');
    const body = await c.req.json<{ objects?: GitHubBatchObject[] }>();
    const objects = body?.objects;
    if (!Array.isArray(objects)) return c.json({ error: 'objects must be an array' }, 400);
    const { owner, repo } = repoParams(c);
    return c.json(await readGitHubObjectsBatch(c.env, tenantId, owner, repo, objects));
  } catch (error) {
    const message = sanitizeError(error);
    return c.json({ error: message }, message === 'Forbidden' ? 403 : message.includes('limited') || message.includes('required') ? 400 : 502);
  }
});
