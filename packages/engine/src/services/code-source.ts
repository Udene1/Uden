import type { Env } from '../types';
import {
  listGitHubRepositories, getGitHubRepository, getGitHubTree, getGitHubTreeBySha,
  getGitHubBlob, getGitHubCommit, getGitHubGitCommit, listGitHubCommits,
  listGitHubPulls, getGitHubPull, createGitHubBranch, commitGitHubFiles,
  createGitHubPull, mergeGitHubPull, type GitHubWriteFile,
} from './github-connector';
import {
  listOriginRepositories, getOriginRepository, listOriginCommits, getOriginCommit,
  getOriginBlob, getOriginGitCommit, getOriginTree, listOriginPulls, getOriginPull,
  getOriginPullFiles, compareOriginCommits, createOriginBranch, commitOriginFiles,
  createOriginPull, mergeOriginPull, type OriginWriteFile,
} from './origin-connector';

export type CodeSourceProvider = 'github' | 'origin';
export interface CodeRepositoryRef { provider: CodeSourceProvider; owner: string; repo: string; }

/** Provider-neutral operations deliberately limited to operations implemented by both sources. */
export interface CodeSource {
  readonly provider: CodeSourceProvider;
  listRepositories(): Promise<unknown>;
  getRepository(ref: CodeRepositoryRef): Promise<unknown>;
  listCommits(ref: CodeRepositoryRef, sha?: string): Promise<unknown>;
  getCommit(ref: CodeRepositoryRef, sha: string): Promise<unknown>;
  getGitCommit(ref: CodeRepositoryRef, sha: string): Promise<unknown>;
  getBlob(ref: CodeRepositoryRef, sha: string): Promise<unknown>;
  getTree(ref: CodeRepositoryRef, sha?: string): Promise<unknown>;
  listPullRequests(ref: CodeRepositoryRef, state?: string): Promise<unknown>;
  getPullRequest(ref: CodeRepositoryRef, number: string | number): Promise<unknown>;
  getPullRequestFiles(ref: CodeRepositoryRef, number: string | number): Promise<unknown>;
  createBranch(ref: CodeRepositoryRef, branch: string, fromSha: string): Promise<unknown>;
  commitFiles(ref: CodeRepositoryRef, branch: string, expectedHeadSha: string, message: string, files: Array<GitHubWriteFile | OriginWriteFile>): Promise<unknown>;
  createPullRequest(ref: CodeRepositoryRef, head: string, base: string, title: string, body?: string): Promise<unknown>;
  mergePullRequest(ref: CodeRepositoryRef, number: string | number, expectedHeadSha: string): Promise<unknown>;
}

function requireProvider(ref: CodeRepositoryRef, expected: CodeSourceProvider): void {
  if (ref.provider !== expected) throw new Error(`Code source provider mismatch: expected ${expected}`);
}
function githubNumber(value: string | number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(n) || n < 1) throw new Error('Invalid pull request number');
  return n;
}

export function createCodeSource(env: Env, tenantId: string, provider: CodeSourceProvider): CodeSource {
  switch (provider) {
    case 'github': return new GitHubCodeSource(env, tenantId);
    case 'origin': return new OriginCodeSource(env, tenantId);
    default: throw new Error(`Unsupported code source provider: ${provider}`);
  }
}

class GitHubCodeSource implements CodeSource {
  readonly provider = 'github' as const;
  constructor(private readonly env: Env, private readonly tenantId: string) {}
  listRepositories() { return listGitHubRepositories(this.env, this.tenantId); }
  getRepository(ref: CodeRepositoryRef) { requireProvider(ref, this.provider); return getGitHubRepository(this.env, this.tenantId, ref.owner, ref.repo); }
  listCommits(ref: CodeRepositoryRef, sha?: string) { requireProvider(ref, this.provider); return listGitHubCommits(this.env, this.tenantId, ref.owner, ref.repo, sha); }
  getCommit(ref: CodeRepositoryRef, sha: string) { requireProvider(ref, this.provider); return getGitHubCommit(this.env, this.tenantId, ref.owner, ref.repo, sha); }
  getGitCommit(ref: CodeRepositoryRef, sha: string) { requireProvider(ref, this.provider); return getGitHubGitCommit(this.env, this.tenantId, ref.owner, ref.repo, sha); }
  getBlob(ref: CodeRepositoryRef, sha: string) { requireProvider(ref, this.provider); return getGitHubBlob(this.env, this.tenantId, ref.owner, ref.repo, sha); }
  getTree(ref: CodeRepositoryRef, sha?: string) { requireProvider(ref, this.provider); return sha ? getGitHubTreeBySha(this.env, this.tenantId, ref.owner, ref.repo, sha) : getGitHubTree(this.env, this.tenantId, ref.owner, ref.repo); }
  listPullRequests(ref: CodeRepositoryRef, state?: string) { requireProvider(ref, this.provider); return listGitHubPulls(this.env, this.tenantId, ref.owner, ref.repo, state); }
  getPullRequest(ref: CodeRepositoryRef, number: string | number) { requireProvider(ref, this.provider); return getGitHubPull(this.env, this.tenantId, ref.owner, ref.repo, githubNumber(number)); }
  getPullRequestFiles(_ref: CodeRepositoryRef, _number: string | number): Promise<unknown> { throw new Error('GitHub pull request file listing is not exposed by the current connector'); }
  createBranch(ref: CodeRepositoryRef, branch: string, fromSha: string) { requireProvider(ref, this.provider); return createGitHubBranch(this.env, this.tenantId, ref.owner, ref.repo, branch, fromSha); }
  commitFiles(ref: CodeRepositoryRef, branch: string, expectedHeadSha: string, message: string, files: Array<GitHubWriteFile | OriginWriteFile>) { requireProvider(ref, this.provider); return commitGitHubFiles(this.env, this.tenantId, ref.owner, ref.repo, branch, expectedHeadSha, message, files as GitHubWriteFile[]); }
  createPullRequest(ref: CodeRepositoryRef, head: string, base: string, title: string, body?: string) { requireProvider(ref, this.provider); return createGitHubPull(this.env, this.tenantId, ref.owner, ref.repo, head, base, title, body); }
  mergePullRequest(ref: CodeRepositoryRef, number: string | number, expectedHeadSha: string) { requireProvider(ref, this.provider); return mergeGitHubPull(this.env, this.tenantId, ref.owner, ref.repo, githubNumber(number), expectedHeadSha); }
}

class OriginCodeSource implements CodeSource {
  readonly provider = 'origin' as const;
  constructor(private readonly env: Env, private readonly tenantId: string) {}
  listRepositories() { return listOriginRepositories(this.env, this.tenantId); }
  getRepository(ref: CodeRepositoryRef) { requireProvider(ref, this.provider); return getOriginRepository(this.env, this.tenantId, ref.owner, ref.repo); }
  listCommits(ref: CodeRepositoryRef, sha?: string) { requireProvider(ref, this.provider); return listOriginCommits(this.env, this.tenantId, ref.owner, ref.repo, sha); }
  getCommit(ref: CodeRepositoryRef, sha: string) { requireProvider(ref, this.provider); return getOriginCommit(this.env, this.tenantId, ref.owner, ref.repo, sha); }
  getGitCommit(ref: CodeRepositoryRef, sha: string) { requireProvider(ref, this.provider); return getOriginGitCommit(this.env, this.tenantId, ref.owner, ref.repo, sha); }
  getBlob(ref: CodeRepositoryRef, sha: string) { requireProvider(ref, this.provider); return getOriginBlob(this.env, this.tenantId, ref.owner, ref.repo, sha); }
  getTree(ref: CodeRepositoryRef, sha?: string) { requireProvider(ref, this.provider); if (!sha) throw new Error('Origin tree SHA is required'); return getOriginTree(this.env, this.tenantId, ref.owner, ref.repo, sha); }
  listPullRequests(ref: CodeRepositoryRef, state?: string) { requireProvider(ref, this.provider); return listOriginPulls(this.env, this.tenantId, ref.owner, ref.repo, state); }
  getPullRequest(ref: CodeRepositoryRef, number: string | number) { requireProvider(ref, this.provider); return getOriginPull(this.env, this.tenantId, ref.owner, ref.repo, String(number)); }
  getPullRequestFiles(ref: CodeRepositoryRef, number: string | number) { requireProvider(ref, this.provider); return getOriginPullFiles(this.env, this.tenantId, ref.owner, ref.repo, String(number)); }
  createBranch(ref: CodeRepositoryRef, branch: string, fromSha: string) { requireProvider(ref, this.provider); return createOriginBranch(this.env, this.tenantId, ref.owner, ref.repo, branch, fromSha); }
  commitFiles(ref: CodeRepositoryRef, branch: string, expectedHeadSha: string, message: string, files: Array<GitHubWriteFile | OriginWriteFile>) { requireProvider(ref, this.provider); return commitOriginFiles(this.env, this.tenantId, ref.owner, ref.repo, branch, expectedHeadSha, message, files as OriginWriteFile[]); }
  createPullRequest(ref: CodeRepositoryRef, head: string, base: string, title: string, body?: string) { requireProvider(ref, this.provider); return createOriginPull(this.env, this.tenantId, ref.owner, ref.repo, head, base, title, body); }
  mergePullRequest(ref: CodeRepositoryRef, number: string | number, expectedHeadSha: string) { requireProvider(ref, this.provider); return mergeOriginPull(this.env, this.tenantId, ref.owner, ref.repo, String(number), expectedHeadSha); }
}
