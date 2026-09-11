import { invoke } from '@tauri-apps/api/core';

export interface LocalCommandRequest {
  workspaceRoot: string;
  cwd: string;
  program: string;
  args?: string[];
  timeoutMs?: number;
  approved?: boolean;
}

export interface CloneRepositoryRequest {
  workspaceRoot: string;
  cwd: string;
  url: string;
  destination: string;
  branch?: string;
  depth?: number;
  timeoutMs?: number;
}

export interface LocalCommandResult {
  status: number;
  success: boolean;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export async function registerWorkspace(path: string): Promise<string> {
  return invoke<string>('register_workspace', { path });
}

export async function listWorkspaces(): Promise<string[]> {
  return invoke<string[]>('list_workspaces');
}

export async function runLocalCommand(request: LocalCommandRequest): Promise<LocalCommandResult> {
  return invoke<LocalCommandResult>('workspace_command', {
    request: {
      workspace_root: request.workspaceRoot,
      cwd: request.cwd,
      program: request.program,
      args: request.args ?? [],
      timeout_ms: request.timeoutMs ?? 120_000,
      approved: request.approved ?? false,
    },
  });
}

export async function cloneRepository(request: CloneRepositoryRequest): Promise<LocalCommandResult> {
  return invoke<LocalCommandResult>('clone_repository', {
    request: {
      workspace_root: request.workspaceRoot,
      cwd: request.cwd,
      url: request.url,
      destination: request.destination,
      branch: request.branch ?? null,
      depth: request.depth ?? null,
      timeout_ms: request.timeoutMs ?? 10 * 60_000,
    },
  });
}
