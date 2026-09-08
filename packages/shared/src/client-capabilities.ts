/**
 * Client capability declarations are shared domain contracts, not UI policy.
 * The engine remains the authority for authorization and execution fences.
 */
export type UdenClient = 'web' | 'desktop' | 'mobile';

export type UdenCapability =
  | 'task.create'
  | 'task.review'
  | 'graph.monitor'
  | 'graph.resume'
  | 'approval.review'
  | 'project.view'
  | 'project.edit'
  | 'filesystem.local'
  | 'git.local'
  | 'runtime.local'
  | 'ollama.local';

export const CLIENT_CAPABILITIES: Record<UdenClient, readonly UdenCapability[]> = {
  web: [
    'task.create',
    'task.review',
    'graph.monitor',
    'graph.resume',
    'approval.review',
    'project.view',
    'project.edit',
  ],
  desktop: [
    'task.create',
    'task.review',
    'graph.monitor',
    'graph.resume',
    'approval.review',
    'project.view',
    'project.edit',
    'filesystem.local',
    'git.local',
    'runtime.local',
    'ollama.local',
  ],
  mobile: [
    'task.create',
    'task.review',
    'graph.monitor',
    'graph.resume',
    'approval.review',
    'project.view',
  ],
};

export function clientHasCapability(client: UdenClient, capability: UdenCapability): boolean {
  return CLIENT_CAPABILITIES[client].includes(capability);
}
