import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { generateCode } from '../services/code-generation';
import { requirePermission, writeAudit } from '../services/permissions';
import { sanitizeError } from '../services/observability';

export const codeRoutes = new Hono<HonoEnv>();

codeRoutes.post('/generate', async c => {
  const tenantId = c.get('tenantId');
  try {
    await requirePermission(c.env.DB, tenantId, 'code:generate');
    const body = await c.req.json().catch(() => ({}));
    const result = await generateCode(c.env, tenantId, {
      instruction: body.instruction,
      language: body.language,
      framework: body.framework,
      projectId: body.projectId,
      existingContext: body.existingContext,
    });

    if (!('taskId' in result)) {
      throw new Error('Code generation did not produce an executable task result');
    }

    await writeAudit(c.env.DB, tenantId, 'code.generate', 'code_generation', result.taskId, undefined, c.get('requestId'), {
      language: result.generatedFor.language,
      framework: result.generatedFor.framework,
      projectId: result.generatedFor.projectId,
    });
    return c.json(result, 200);
  } catch (error) {
    const message = sanitizeError(error);
    return c.json({ error: message }, message === 'Forbidden' ? 403 : 400);
  }
});
