import { listWorkspaces, registerWorkspace, unregisterWorkspace } from './local-command';

const SELECTED_WORKSPACE_KEY = 'uden.desktop.workspace';

export interface WorkspaceManagerState {
  workspaces: string[];
  selected: string | null;
}

export async function loadWorkspaceState(): Promise<WorkspaceManagerState> {
  const workspaces = await listWorkspaces();
  const stored = localStorage.getItem(SELECTED_WORKSPACE_KEY);
  const selected = stored && workspaces.includes(stored) ? stored : workspaces[0] ?? null;
  if (selected) localStorage.setItem(SELECTED_WORKSPACE_KEY, selected);
  else localStorage.removeItem(SELECTED_WORKSPACE_KEY);
  return { workspaces, selected };
}

export async function addWorkspace(path: string): Promise<WorkspaceManagerState> {
  const normalized = path.trim();
  if (!normalized) throw new Error('Workspace path is required.');
  await registerWorkspace(normalized);
  localStorage.setItem(SELECTED_WORKSPACE_KEY, normalized);
  return loadWorkspaceState();
}

export async function removeWorkspace(path: string): Promise<WorkspaceManagerState> {
  await unregisterWorkspace(path);
  const current = localStorage.getItem(SELECTED_WORKSPACE_KEY);
  if (current === path) localStorage.removeItem(SELECTED_WORKSPACE_KEY);
  return loadWorkspaceState();
}

export function selectWorkspace(path: string | null): string | null {
  if (path) localStorage.setItem(SELECTED_WORKSPACE_KEY, path);
  else localStorage.removeItem(SELECTED_WORKSPACE_KEY);
  return path;
}
