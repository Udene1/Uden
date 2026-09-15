import { approveLocalCommand, runLocalCommand, type LocalCommandResult } from './local-command';

export interface GitWorkspaceState {
  branch: string;
  tracking: string | null;
  changed: number;
  staged: number;
  ahead: number;
  behind: number;
  clean: boolean;
  recentCommits: string[];
}

function parsePorcelain(output: string) {
  const lines = output.split('\n').filter(Boolean);
  const header = lines.shift() ?? '';
  const branch = header.match(/^##\s+([^\.\s]+)(?:\.\.([^\s]+))?/)?.[1] ?? 'unknown';
  const tracking = header.match(/^##\s+[^\.\s]+\.\.([^\s]+)/)?.[1] ?? null;
  let changed = 0;
  let staged = 0;
  for (const line of lines) {
    if (line.startsWith('??')) changed++;
    else {
      if (line[0] && line[0] !== ' ') staged++;
      if (line[1] && line[1] !== ' ') changed++;
    }
  }
  return { branch, tracking, changed, staged };
}

async function git(cwd: string, args: string[]): Promise<LocalCommandResult> {
  return runLocalCommand({ workspaceRoot: cwd, cwd, program: 'git', args });
}

export async function inspectGitWorkspace(cwd: string): Promise<GitWorkspaceState> {
  const status = await git(cwd, ['status', '--porcelain=v1', '--branch']);
  if (!status.success) throw new Error(status.stderr || 'Unable to inspect Git workspace.');
  const parsed = parsePorcelain(status.stdout);
  const log = await git(cwd, ['log', '-8', '--pretty=format:%h %s']);
  if (!log.success) throw new Error(log.stderr || 'Unable to read Git history.');
  const counts = await git(cwd, ['rev-list', '--left-right', '--count', '@{upstream}...HEAD']).catch(() => null);
  let ahead = 0;
  let behind = 0;
  if (counts?.success) {
    const parts = counts.stdout.trim().split(/\s+/).map(Number);
    behind = parts[0] || 0;
    ahead = parts[1] || 0;
  }
  return { ...parsed, ahead, behind, clean: parsed.changed === 0 && parsed.staged === 0, recentCommits: log.stdout.split('\n').filter(Boolean) };
}

export async function listGitBranches(cwd: string): Promise<string[]> {
  const result = await git(cwd, ['branch', '--format=%(refname:short)']);
  if (!result.success) throw new Error(result.stderr || 'Unable to list Git branches.');
  return result.stdout.split('\n').map(v => v.trim()).filter(Boolean);
}

export async function gitDiffStat(cwd: string): Promise<string> {
  const result = await git(cwd, ['diff', '--stat']);
  if (!result.success) throw new Error(result.stderr || 'Unable to inspect Git diff.');
  return result.stdout || 'Working tree has no unstaged diff.';
}

export async function checkoutGitBranch(cwd: string, branch: string): Promise<LocalCommandResult> {
  const request = { workspaceRoot: cwd, cwd, program: 'git', args: ['checkout', '--', branch] };
  const approvalToken = await approveLocalCommand(request);
  return runLocalCommand({ ...request, approvalToken });
}
