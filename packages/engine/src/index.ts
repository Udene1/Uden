import { Hono } from 'hono';
import { HonoEnv } from './types';
import { cors } from './middleware/cors';
import { authMiddleware } from './middleware/auth';
import { ratelimit } from './middleware/ratelimit';

// Import routes
import { taskRoutes } from './routes/tasks';
import { tenantRoutes } from './routes/tenants';
import { projectRoutes } from './routes/projects';
import { usageRoutes } from './routes/usage';
import { healthRoutes } from './routes/health';

const app = new Hono<HonoEnv>();

app.use('*', cors());
app.use('/api/v1/tasks/*', authMiddleware, ratelimit);
app.use('/api/v1/projects/*', authMiddleware, ratelimit);
app.use('/api/v1/usage/*', authMiddleware, ratelimit);
app.use('/api/v1/tenant', authMiddleware);
app.use('/api/v1/tenant/*', authMiddleware);

app.route('/api/v1/tasks', taskRoutes);
app.route('/api/v1/tenants', tenantRoutes); // Note: registration doesn't need auth
app.route('/api/v1/tenant', tenantRoutes);
app.route('/api/v1/projects', projectRoutes);
app.route('/api/v1/usage', usageRoutes);
app.route('/api/v1/health', healthRoutes);

export default app;
