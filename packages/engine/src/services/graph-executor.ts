import type { HonoEnv } from '../types';
import { checkBudget, recordUsage } from './cost';
import { checkQuality } from './quality';
import { getProvider } from './providers';
import { routeGraphNode } from './graph-router';
import { createEscalationLog, createTask, getMonthlySpend, getTenantById, updateTask } from '../db/queries';
import { classifyTask } from './classifier';
import type { Task, TaskGraph, TaskGraphPlan, TaskNode, TaskNodeStatus } from '@ai-work-partner/shared';
import { MAX_ESCALATION_ATTEMPTS } from '@ai-work-partner/shared';

export interface GraphExecutionResult {
  graph: TaskGraph;
  status: 'completed' | 'failed' | 'blocked';
  output: string;
  totalCostCents: number;
  tokensIn: number;
  tokensOut: number;
  executionOrder: string[];
}

function validatePlan(plan: TaskGraphPlan): void {
  const ids = new Set<string>();
  for (const node of plan.nodes) {
    if (ids.has(node.id)) throw new Error(`Invalid graph: duplicate node id '${node.id}'`);
    ids.add(node.id);
    if (node.dependencies.includes(node.id)) {
      throw new Error(`Invalid graph: node '${node.id}' depends on itself`);
    }
  }

  for (const node of plan.nodes) {
    for (const dependency of node.dependencies) {
      if (!ids.has(dependency)) {
        throw new Error(`Invalid graph: node '${node.id}' depends on missing node '${dependency}'`);
      }
    }
  }

  // Kahn-style cycle detection without mutating the supplied plan.
  const remaining = new Map(plan.nodes.map((node) => [node.id, new Set(node.dependencies)]));
  let resolved = 0;
  while (remaining.size > 0) {
    const ready = [...remaining.entries()]
      .filter(([, dependencies]) => dependencies.size === 0)
      .map(([id]) => id);
    if (ready.length === 0) throw new Error('Invalid graph: dependency cycle detected');
    for (const id of ready) remaining.delete(id);
    for (const dependencies of remaining.values()) {
      for (const id of ready) dependencies.delete(id);
    }
    resolved += ready.length;
  }

  if (resolved !== plan.nodes.length) throw new Error('Invalid graph: graph could not be fully resolved');
}

function buildNodePrompt(node: TaskNode, graph: TaskGraph): string {
  const upstream = node.contextFrom
    .map((id) => graph.nodes.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is TaskNode => Boolean(candidate?.output))
    .map((candidate) =>
      `### ${candidate.id}: ${candidate.title}\nQuality score: ${candidate.qualityScore ?? 'n/a'}\nOutput:\n${candidate.output}`
    )
    .join('\n\n');

  return upstream
    ? `${node.prompt}\n\nUse the following completed upstream work as context. Do not invent missing upstream results.\n\n${upstream}`
    : node.prompt;
}

function setNodeStatus(node: TaskNode, status: TaskNodeStatus): void {
  node.status = status;
}

async function executeNode(
  env: HonoEnv['Bindings'],
  graph: TaskGraph,
  node: TaskNode,
  tenantId: string,
  qualityPreference: 'cost-optimized' | 'balanced' | 'quality-first',
  budgetLeftCents: () => Promise<number>
): Promise<void> {
  const decision = routeGraphNode(node, {
    qualityPreference,
    budgetLeftCents: await budgetLeftCents(),
  });

  node.selectedModel = decision.primaryModel;
  node.attemptedModels.push(decision.primaryModel);
  setNodeStatus(node, 'running');

  const prompt = buildNodePrompt(node, graph);

  if (!(await checkBudget(env, tenantId))) {
    node.error = 'Budget exceeded before node execution';
    setNodeStatus(node, 'failed');
    return;
  }

  try {
    const provider = getProvider(env, decision.primaryModel);
    const response = await provider.execute(prompt, decision.primaryModel);
    const primaryCost = await recordUsage(
      env,
      tenantId,
      graph.rootTaskId,
      decision.primaryModel,
      response.promptTokens,
      response.completionTokens
    );

    node.tokensIn = response.promptTokens;
    node.tokensOut = response.completionTokens;
    node.costCents = primaryCost;

    let quality = checkQuality(response.result, node.expectedFormat, prompt);
    let finalOutput = response.result;
    let finalModel = decision.primaryModel;

    if (quality.shouldEscalate && decision.fallbackChain.length > 0) {
      const models = decision.fallbackChain.slice(0, MAX_ESCALATION_ATTEMPTS);
      let previousModel = decision.primaryModel;

      for (let index = 0; index < models.length; index += 1) {
        if (!(await checkBudget(env, tenantId))) break;

        const modelId = models[index];
        node.attemptedModels.push(modelId);
        await createEscalationLog(env.DB, {
          id: crypto.randomUUID(),
          taskId: graph.rootTaskId,
          fromModel: previousModel,
          toModel: modelId,
          reason:
            quality.escalationReason ||
            quality.checks.filter((check) => !check.passed).map((check) => check.reason).join('; ') ||
            'Quality threshold failed',
          qualityScore: quality.overallScore,
          attemptNumber: index + 2,
          createdAt: new Date().toISOString(),
        });

        try {
          const escalationProvider = getProvider(env, modelId);
          const escalated = await escalationProvider.execute(prompt, modelId, {
            systemPrompt:
              `You are completing a quality-escalated work node. The previous attempt failed quality checks. ` +
              `Produce a complete ${node.expectedFormat} response that directly satisfies the node request.`,
          });
          const escalationCost = await recordUsage(
            env,
            tenantId,
            graph.rootTaskId,
            modelId,
            escalated.promptTokens,
            escalated.completionTokens
          );

          node.tokensIn = (node.tokensIn || 0) + escalated.promptTokens;
          node.tokensOut = (node.tokensOut || 0) + escalated.completionTokens;
          node.costCents = (node.costCents || 0) + escalationCost;

          const candidateQuality = checkQuality(escalated.result, node.expectedFormat, prompt);
          if (candidateQuality.overallScore >= quality.overallScore) {
            quality = candidateQuality;
            finalOutput = escalated.result;
            finalModel = modelId;
          }

          if (!candidateQuality.shouldEscalate) break;
          previousModel = modelId;
        } catch (error: any) {
          node.error = `Model ${modelId} failed: ${error?.message || 'unknown provider error'}`;
          previousModel = modelId;
        }
      }
    }

    node.output = finalOutput;
    node.selectedModel = finalModel;
    node.qualityScore = quality.overallScore;
    if (quality.shouldEscalate) {
      node.error = node.error || 'Quality threshold remained below the escalation stop condition';
      setNodeStatus(node, 'failed');
    } else {
      setNodeStatus(node, 'completed');
    }
  } catch (error: any) {
    node.error = error?.message || 'Node execution failed';
    setNodeStatus(node, 'failed');
  }
}

function blockDependents(graph: TaskGraph): void {
  const failed = new Set(
    graph.nodes.filter((node) => node.status === 'failed').map((node) => node.id)
  );

  let changed = true;
  while (changed) {
    changed = false;
    for (const node of graph.nodes) {
      if (node.status !== 'pending' && node.status !== 'ready') continue;
      const failedDependency = node.dependencies.find((dependency) => failed.has(dependency));
      if (failedDependency) {
        node.error = `Blocked by failed dependency: ${failedDependency}`;
        setNodeStatus(node, 'blocked');
        failed.add(node.id);
        changed = true;
      }
    }
  }
}

export async function executeTaskGraph(
  env: HonoEnv['Bindings'],
  tenantId: string,
  plan: TaskGraphPlan,
  projectId?: string
): Promise<GraphExecutionResult> {
  validatePlan(plan);
  if (plan.nodes.length === 0) throw new Error('Invalid graph: at least one node is required');

  const tenant = await getTenantById(env.DB, tenantId);
  const qualityPreference = tenant?.qualityPreference || 'balanced';
  const rootClassification = classifyTask(plan.goal);
  const rootTask: Task = {
    id: crypto.randomUUID(),
    tenantId,
    projectId,
    prompt: plan.goal,
    mode: 'permissionless',
    status: 'processing',
    classifiedTier: rootClassification.recommendedTier,
    classifiedDomain: rootClassification.domain,
    classifiedComplexity: rootClassification.complexity,
    expectedFormat: rootClassification.expectedFormat,
    escalationCount: 0,
    createdAt: new Date().toISOString(),
  };
  await createTask(env.DB, rootTask, {
    primaryModel: 'graph',
    fallbackChain: [],
    estimatedCostCents: 0,
    reasoning: 'Root task created for task-graph execution',
  });

  const graph: TaskGraph = {
    id: crypto.randomUUID(),
    rootTaskId: rootTask.id,
    goal: plan.goal,
    nodes: plan.nodes.map((node) => ({
      ...node,
      status: node.dependencies.length === 0 ? 'ready' : 'pending',
      attemptedModels: [],
    })),
    createdAt: new Date().toISOString(),
  };

  const executionOrder: string[] = [];
  let totalCostCents = 0;
  let tokensIn = 0;
  let tokensOut = 0;

  const budgetLeft = async () => {
    const budget = tenant?.monthlyBudgetCents || 10000;
    const spent = await getMonthlySpend(env.DB, tenantId);
    return Math.max(0, budget - spent);
  };

  while (graph.nodes.some((node) => node.status === 'pending' || node.status === 'ready')) {
    blockDependents(graph);
    const ready = graph.nodes.filter((node) => {
      if (node.status !== 'ready' && node.status !== 'pending') return false;
      return node.dependencies.every((dependency) =>
        graph.nodes.some((candidate) => candidate.id === dependency && candidate.status === 'completed')
      );
    });

    if (ready.length === 0) break;

    // Sequential waves keep budget accounting deterministic until atomic budget reservation exists.
    for (const node of ready) {
      await executeNode(env, graph, node, tenantId, qualityPreference, budgetLeft);
      executionOrder.push(node.id);
      totalCostCents += node.costCents || 0;
      tokensIn += node.tokensIn || 0;
      tokensOut += node.tokensOut || 0;
      blockDependents(graph);
    }
  }

  const failed = graph.nodes.some((node) => node.status === 'failed');
  const blocked = graph.nodes.some((node) => node.status === 'blocked');
  const status: GraphExecutionResult['status'] = failed ? 'failed' : blocked ? 'blocked' : 'completed';
  graph.completedAt = status === 'completed' ? new Date().toISOString() : undefined;

  const terminalNodes = graph.nodes.filter(
    (node) => !graph.nodes.some((candidate) => candidate.dependencies.includes(node.id))
  );
  const output = terminalNodes
    .filter((node) => node.output)
    .map((node) => node.output)
    .join('\n\n');

  await updateTask(env.DB, rootTask.id, tenantId, {
    status: status === 'completed' ? 'completed' : 'failed',
    output,
    totalCostCents: Math.round(totalCostCents * 100) / 100,
    tokensIn,
    tokensOut,
    escalationCount: graph.nodes.reduce(
      (count, node) => count + Math.max(0, node.attemptedModels.length - 1),
      0
    ),
    completedAt: status === 'completed' ? new Date().toISOString() : undefined,
  });

  return {
    graph,
    status,
    output,
    totalCostCents: Math.round(totalCostCents * 100) / 100,
    tokensIn,
    tokensOut,
    executionOrder,
  };
}
