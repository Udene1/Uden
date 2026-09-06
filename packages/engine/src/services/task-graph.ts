import {
  classifyTask,
  type TaskClassification,
} from './classifier';
import type {
  TaskGraph,
  TaskGraphPlan,
  TaskNode,
  TaskNodeStatus,
} from '@ai-work-partner/shared';

interface NodeDraft {
  id: string;
  title: string;
  prompt: string;
  dependencies: string[];
  contextFrom: string[];
  classification: TaskClassification;
}

const hasAny = (text: string, terms: string[]) =>
  terms.some((term) => text.includes(term));

/**
 * Deterministic first-pass decomposition. The planner is intentionally
 * conservative: simple requests remain one node; compound requests become
 * independently routable work units with explicit dependencies.
 */
export function decomposeTask(prompt: string): TaskGraphPlan {
  const normalized = prompt.toLowerCase();
  const root = classifyTask(prompt);

  const drafts: NodeDraft[] = [];
  const add = (
    id: string,
    title: string,
    nodePrompt: string,
    dependencies: string[] = [],
    contextFrom: string[] = []
  ) => {
    drafts.push({
      id,
      title,
      prompt: nodePrompt,
      dependencies,
      contextFrom,
      classification: classifyTask(nodePrompt),
    });
  };

  const compound =
    normalized.length > 500 ||
    (hasAny(normalized, [' and ', ' then ', ' also ', ' plus ']) &&
      hasAny(normalized, [
        'build',
        'create',
        'implement',
        'design',
        'analyze',
        'research',
        'review',
        'test',
        'deploy',
      ]));

  if (!compound) {
    add('task', 'Execute request', prompt);
  } else {
    const hasResearch = hasAny(normalized, ['research', 'investigate', 'sources', 'compare']);
    const hasPlanning = hasAny(normalized, ['plan', 'requirements', 'architecture', 'design']);
    const hasData = hasAny(normalized, ['database', 'schema', 'data model', 'migration']);
    const hasCode = hasAny(normalized, ['code', 'build', 'implement', 'develop', 'api', 'backend', 'frontend']);
    const hasReview = hasAny(normalized, ['review', 'audit', 'security', 'verify']);
    const hasTest = hasAny(normalized, ['test', 'tests', 'testing', 'validate']);

    if (hasResearch) add('research', 'Research and gather evidence', `Research the relevant facts, constraints, alternatives, and sources needed to complete this request. Preserve concise findings for downstream work.\n\nOriginal request:\n${prompt}`);
    if (hasPlanning) add('planning', 'Define requirements and architecture', `Turn the original request into concrete requirements and an implementation architecture. Identify interfaces, constraints, dependencies, and acceptance criteria.\n\nOriginal request:\n${prompt}`, hasResearch ? ['research'] : [], hasResearch ? ['research'] : []);
    if (hasData) add('data', 'Design data layer', `Design the database schema, entities, relationships, indexes, migrations, and data-access boundaries required by the original request.\n\nOriginal request:\n${prompt}`, hasPlanning ? ['planning'] : hasResearch ? ['research'] : [], hasPlanning ? ['planning'] : hasResearch ? ['research'] : []);
    if (hasCode) {
      const deps = drafts.map((draft) => draft.id).filter((id) => id !== 'research');
      const contexts = drafts.map((draft) => draft.id);
      add('implementation', 'Implement the solution', `Implement the requested solution using the requirements and design produced by upstream nodes. Keep changes focused, production-ready, and compatible with the existing codebase.\n\nOriginal request:\n${prompt}`, deps, contexts);
    }
    if (hasTest) add('testing', 'Test and validate', `Test the implementation against the original requirements. Run the strongest available real tests, identify failures, and report concrete fixes needed. Do not replace real integrations with mocks merely to make tests pass.\n\nOriginal request:\n${prompt}`, drafts.length ? drafts.map((draft) => draft.id) : [], drafts.length ? drafts.map((draft) => draft.id) : []);
    if (hasReview) add('review', 'Review and verify', `Perform a final correctness, security, quality, and requirements review of the work produced for the original request. Identify only actionable defects or approval.\n\nOriginal request:\n${prompt}`, drafts.length ? drafts.map((draft) => draft.id) : [], drafts.length ? drafts.map((draft) => draft.id) : []);

    if (drafts.length === 0) {
      add('task', 'Execute request', prompt);
    }
  }

  return {
    goal: prompt,
    nodes: drafts.map((draft) => ({
      id: draft.id,
      title: draft.title,
      prompt: draft.prompt,
      domain: draft.classification.domain,
      complexity: draft.classification.complexity,
      expectedFormat: draft.classification.expectedFormat,
      recommendedTier: draft.classification.recommendedTier,
      dependencies: draft.dependencies,
      contextFrom: draft.contextFrom,
    })),
  };
}

export function createTaskGraph(rootTaskId: string, plan: TaskGraphPlan, now = new Date().toISOString()): TaskGraph {
  const nodes: TaskNode[] = plan.nodes.map((node) => ({
    ...node,
    status: node.dependencies.length === 0 ? ('ready' as TaskNodeStatus) : 'pending',
    attemptedModels: [],
  }));

  return {
    id: crypto.randomUUID(),
    rootTaskId,
    goal: plan.goal,
    nodes,
    createdAt: now,
  };
}

/** Return nodes whose dependencies have all completed. */
export function getReadyNodes(graph: TaskGraph): TaskNode[] {
  const completed = new Set(
    graph.nodes.filter((node) => node.status === 'completed').map((node) => node.id)
  );

  return graph.nodes.filter(
    (node) =>
      (node.status === 'pending' || node.status === 'ready') &&
      node.dependencies.every((dependency) => completed.has(dependency))
  );
}
