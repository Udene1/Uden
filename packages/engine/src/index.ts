import { Hono } from 'hono';
import type { HonoEnv, Env, GraphExecutionQueueMessage } from './types';
import { cors } from './middleware/cors';
import { authMiddleware } from './middleware/auth';
import { ratelimit } from './middleware/ratelimit';
import { taskRoutes } from './routes/tasks';
import { tenantRoutes } from './routes/tenants';
import { projectRoutes } from './routes/projects';
import { usageRoutes } from './routes/usage';
import { healthRoutes } from './routes/health';
import { resumeTaskGraph } from './services/graph-executor';

const app = new Hono<HonoEnv>();
app.use('*', cors());
app.use('/api/v1/tasks/*', authMiddleware, ratelimit);
app.use('/api/v1/projects/*', authMiddleware, ratelimit);
app.use('/api/v1/usage/*', authMiddleware, ratelimit);
app.use('/api/v1/tenant', authMiddleware);
app.use('/api/v1/tenant/*', authMiddleware);
app.route('/api/v1/tasks', taskRoutes);
app.route('/api/v1/tenants', tenantRoutes);
app.route('/api/v1/tenant', tenantRoutes);
app.route('/api/v1/projects', projectRoutes);
app.route('/api/v1/usage', usageRoutes);
app.route('/api/v1/health', healthRoutes);

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<GraphExecutionQueueMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await resumeTaskGraph(env, message.body.tenantId, message.body.graphId);
        message.ack();
      } catch (error) {
        console.error(JSON.stringify({ event: 'graph_queue_failed', messageId: message.id, graphId: message.body.graphId, tenantId: message.body.tenantId, error: error instanceof Error ? error.message : 'unknown' }));
        message.retry({ delaySeconds: 30 });
      }
    }
  },
};
