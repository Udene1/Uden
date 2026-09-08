import type { HonoEnv, GraphExecutionQueueMessage } from '../types';
import type { Task, TaskGraphPlan, TaskGraph } from '@ai-work-partner/shared';
import { classifyTask } from './classifier';
import { createTask } from '../db/queries';
import { persistGraph } from './graph-persistence';
import { validateTaskGraphPlan } from './graph-executor';

export async function prepareBackgroundGraph(env: HonoEnv['Bindings'], tenantId: string, plan: TaskGraphPlan, projectId?: string, executionPrincipal?: string): Promise<{ graphId: string }> {
  validateTaskGraphPlan(plan);
  if (plan.nodes.length === 0) throw new Error('Invalid graph: at least one node is required');
  const classification = classifyTask(plan.goal);
  const rootTask: Task = {
    id: crypto.randomUUID(), tenantId, projectId, prompt: plan.goal, mode: 'permissionless', status: 'processing',
    classifiedTier: classification.recommendedTier, classifiedDomain: classification.domain, classifiedComplexity: classification.complexity,
    expectedFormat: classification.expectedFormat, escalationCount: 0, createdAt: new Date().toISOString()
  };
  const graphId = crypto.randomUUID();
  const graph: TaskGraph = {
    id: graphId, rootTaskId: rootTask.id, goal: plan.goal, executionPrincipal,
    nodes: plan.nodes.map((node) => ({ ...node, status: node.dependencies.length === 0 ? 'ready' : 'pending', attemptedModels: [] })),
    createdAt: new Date().toISOString()
  };
  await createTask(env.DB, rootTask, { primaryModel: 'graph', fallbackChain: [], estimatedCostCents: 0, reasoning: 'Root task created for background task-graph execution' });
  await persistGraph(env.DB, tenantId, graph, projectId);
  return { graphId };
}

export function backgroundQueueMessage(tenantId: string, graphId: string, executionPrincipal?: string): GraphExecutionQueueMessage {
  return { tenantId, graphId, executionPrincipal, enqueuedAt: new Date().toISOString() };
}
