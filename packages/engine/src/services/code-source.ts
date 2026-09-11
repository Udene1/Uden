import type { Env } from '../types';
import {
  listGitHubRepositories, getGitHubTree, getGitHubTreeBySha, getGitHubBlob,
  getGitHubCommit, listGitHubCommits, listGitHubPulls, getGitHubPull, getGitHubPullFiles,
  createGitHubBranch, commitGitHubFiles, createGitHubPull, mergeGitHubPull,
  type GitHubWriteFile,
} from './github-connector';
import {
  listOriginRepositories, listOriginCommits, getOriginCommit, getOriginBlob,
  getOriginTree, listOriginPulls, getOriginPull, getOriginPullFiles,
  createOriginBranch, commitOriginFiles, createOriginPull, mergeOriginPull,
  type OriginWriteFile,
} from './origin-connector';

export type CodeSourceProvider = 'github' | 'origin';
export interface CodeRepositoryRef { provider: CodeSourceProvider; owner: string; repo: string; }
export interface CodeFileChange { path: string; content: string; }
export interface CodeMutationPrecondition { expectedHeadSha: string; }

export interface CodeSource {
  provider: CodeSourceProvider;
  listRepositories(env: Env, tenantId: string): Promise<unknown>;
  getRepository(env: Env, tenantId: string, ref: CodeRepositoryRef): Promise<unknown>;
  getTree(env: Env, tenantId: string, ref: CodeRepositoryRef, treeRef: string): Promise<unknown>;
  getBlob(env: Env, tenantId: string, ref: CodeRepositoryRef, sha: string): Promise<unknown>;
  getCommit(env: Env, tenantId: string, ref: CodeRepositoryRef, sha: string): Promise<unknown>;
  listCommits(env: Env, tenantId: string, ref: CodeRepositoryRef, branch?: string): Promise<unknown>;
  listPullRequests(env: Env, tenantId: string, ref: CodeRepositoryRef): Promise<unknown>;
  getPullRequest(env: Env, tenantId: string, ref: CodeRepositoryRef, number: number): Promise<unknown>;
  getPullRequestFiles(env: Env, tenantId: string, ref: CodeRepositoryRef, number: number): Promise<unknown>;
  createBranch(env: Env, tenantId: string, ref: CodeRepositoryRef, branch: string, fromSha: string): Promise<unknown>;
  commitFiles(env: Env, tenantId: string, ref: CodeRepositoryRef, branch: string, changes: CodeFileChange[], precondition: CodeMutationPrecondition, message: string): Promise<unknown>;
  createPullRequest(env: Env, tenantId: string, ref: CodeRepositoryRef, head: string, base: string, title: string, body: string): Promise<unknown>;
  mergePullRequest(env: Env, tenantId: string, ref: CodeRepositoryRef, number: number, precondition: CodeMutationPrecondition): Promise<unknown>;
}

function assertProviderRef(provider: CodeSourceProvider, ref: CodeRepositoryRef): void {
  if (ref.provider !== provider) throw new Error(`Code repository provider mismatch: expected ${provider}, received ${ref.provider}`);
  if (!ref.owner.trim() || !ref.repo.trim()) throw new Error('Code repository owner and name are required');
}
function githubOwnerRepo(ref: CodeRepositoryRef): [string, string] { assertProviderRef('github', ref); return [ref.owner, ref.repo]; }
function originOwnerRepo(ref: CodeRepositoryRef): [string, string] { assertProviderRef('origin', ref); return [ref.owner, ref.repo]; }

export function getCodeSource(provider: CodeSourceProvider): CodeSource {
  if (provider === 'github') return {
    provider,
    listRepositories: (env, tenantId) => listGitHubRepositories(env, tenantId),
    getRepository: async (env, tenantId, ref) => {
      const [owner, repo] = githubOwnerRepo(ref);
      const repositories = await listGitHubRepositories(env, tenantId);
      return repositories.find(r => r.full_name === `${owner}/${repo}`) ?? null;
    },
    getTree: (env, tenantId, ref, treeRef) => {
      const [owner, repo] = githubOwnerRepo(ref);
      return /^[0-9a-f]{7,64}$/i.test(treeRef) ? getGitHubTreeBySha(env, tenantId, owner, repo, treeRef) : getGitHubTree(env, tenantId, owner, repo, treeRef);
    },
    getBlob: (env, tenantId, ref, sha) => { const [owner, repo] = githubOwnerRepo(ref); return getGitHubBlob(env, tenantId, owner, repo, sha); },
    getCommit: (env, tenantId, ref, sha) => { const [owner, repo] = githubOwnerRepo(ref); return getGitHubCommit(env, tenantId, owner, repo, sha); },
    listCommits: (env, tenantId, ref, branch) => { const [owner, repo] = githubOwnerRepo(ref); return listGitHubCommits(env, tenantId, owner, repo, branch); },
    listPullRequests: (env, tenantId, ref) => { const [owner, repo] = githubOwnerRepo(ref); return listGitHubPulls(env, tenantId, owner, repo); },
    getPullRequest: (env, tenantId, ref, number) => { const [owner, repo] = githubOwnerRepo(ref); return getGitHubPull(env, tenantId, owner, repo, number); },
    getPullRequestFiles: (env, tenantId, ref, number) => { const [owner, repo] = githubOwnerRepo(ref); return getGitHubPullFiles(env, tenantId, owner, repo, number); },
    createBranch: (env, tenantId, ref, branch, fromSha) => { const [owner, repo] = githubOwnerRepo(ref); return createGitHubBranch(env, tenantId, owner, repo, branch, fromSha); },
    commitFiles: (env, tenantId, ref, branch, changes, precondition, message) => { const [owner, repo] = githubOwnerRepo(ref); return commitGitHubFiles(env, tenantId, owner, repo, branch, precondition.expectedHeadSha, message, changes as GitHubWriteFile[]); },
    createPullRequest: (env, tenantId, ref, head, base, title, body) => { const [owner, repo] = githubOwnerRepo(ref); return createGitHubPull(env, tenantId, owner, repo, head, base, title, body); },
    mergePullRequest: (env, tenantId, ref, number, precondition) => { const [owner, repo] = githubOwnerRepo(ref); return mergeGitHubPull(env, tenantId, owner, repo, number, precondition.expectedHeadSha); },
  };
  return {
    provider,
    listRepositories: (env, tenantId) => listOriginRepositories(env, tenantId),
    getRepository: async (env, tenantId, ref) => { const [owner, repo] = originOwnerRepo(ref); const result = await listOriginRepositories(env, tenantId) as { repositories?: Array<{ namespace?: string; name?: string }> }; return result.repositories?.find(r => r.namespace === owner && r.name === repo) ?? null; },
    getTree: (env, tenantId, ref, treeRef) => { const [owner, repo] = originOwnerRepo(ref); return getOriginTree(env, tenantId, owner, repo, treeRef); },
    getBlob: (env, tenantId, ref, sha) => { const [owner, repo] = originOwnerRepo(ref); return getOriginBlob(env, tenantId, owner, repo, sha); },
    getCommit: (env, tenantId, ref, sha) => { const [owner, repo] = originOwnerRepo(ref); return getOriginCommit(env, tenantId, owner, repo, sha); },
    listCommits: (env, tenantId, ref, branch) => { const [owner, repo] = originOwnerRepo(ref); return listOriginCommits(env, tenantId, owner, repo, branch); },
    listPullRequests: (env, tenantId, ref) => { const [owner, repo] = originOwnerRepo(ref); return listOriginPulls(env, tenantId, owner, repo); },
    getPullRequest: (env, tenantId, ref, number) => { const [owner, repo] = originOwnerRepo(ref); return getOriginPull(env, tenantId, owner, repo, String(number)); },
    getPullRequestFiles: (env, tenantId, ref, number) => { const [owner, repo] = originOwnerRepo(ref); return getOriginPullFiles(env, tenantId, owner, repo, String(number)); },
    createBranch: (env, tenantId, ref, branch, fromSha) => { const [owner, repo] = originOwnerRepo(ref); return createOriginBranch(env, tenantId, owner, repo, branch, fromSha); },
    commitFiles: (env, tenantId, ref, branch, changes, precondition, message) => { const [owner, repo] = originOwnerRepo(ref); return commitOriginFiles(env, tenantId, owner, repo, branch, precondition.expectedHeadSha, message, changes as OriginWriteFile[]); },
    createPullRequest: (env, tenantId, ref, head, base, title, body) => { const [owner, repo] = originOwnerRepo(ref); return createOriginPull(env, tenantId, owner, repo, head, base, title, body); },
    mergePullRequest: (env, tenantId, ref, number, precondition) => { const [owner, repo] = originOwnerRepo(ref); return mergeOriginPull(env, tenantId, owner, repo, String(number), precondition.expectedHeadSha); },
  };
}
