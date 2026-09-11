import type { Env } from '../types';
import {
  listGitHubRepositories, getGitHubTree, getGitHubTreeBySha, getGitHubBlob,
  getGitHubCommit, listGitHubCommits, listGitHubPulls, getGitHubPull,
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

function githubRef(ref: CodeRepositoryRef) { return `${ref.owner}/${ref.repo}`; }
function originRef(ref: CodeRepositoryRef) { return { namespace: ref.owner, repository: ref.repo }; }

export function getCodeSource(provider: CodeSourceProvider): CodeSource {
  if (provider === 'github') return {
    provider,
    listRepositories: (env, tenantId) => listGitHubRepositories(env, tenantId),
    getRepository: async (env, tenantId, ref) => {
      const result = await listGitHubRepositories(env, tenantId) as { repositories?: Array<{ full_name?: string }> };
      return result.repositories?.find(r => r.full_name === githubRef(ref)) ?? null;
    },
    getTree: (env, tenantId, ref, treeRef) => /^[0-9a-f]{7,64}$/i.test(treeRef)
      ? getGitHubTreeBySha(env, tenantId, githubRef(ref), treeRef)
      : getGitHubTree(env, tenantId, githubRef(ref), treeRef),
    getBlob: (env, tenantId, ref, sha) => getGitHubBlob(env, tenantId, githubRef(ref), sha),
    getCommit: (env, tenantId, ref, sha) => getGitHubCommit(env, tenantId, githubRef(ref), sha),
    listCommits: (env, tenantId, ref, branch) => listGitHubCommits(env, tenantId, githubRef(ref), branch),
    listPullRequests: (env, tenantId, ref) => listGitHubPulls(env, tenantId, githubRef(ref)),
    getPullRequest: (env, tenantId, ref, number) => getGitHubPull(env, tenantId, githubRef(ref), number),
    getPullRequestFiles: async (env, tenantId, ref, number) => (await getGitHubPull(env, tenantId, githubRef(ref), number) as any).files ?? [],
    createBranch: (env, tenantId, ref, branch, fromSha) => createGitHubBranch(env, tenantId, githubRef(ref), branch, fromSha),
    commitFiles: (env, tenantId, ref, branch, changes, precondition, message) => commitGitHubFiles(env, tenantId, githubRef(ref), branch, changes as GitHubWriteFile[], precondition.expectedHeadSha, message),
    createPullRequest: (env, tenantId, ref, head, base, title, body) => createGitHubPull(env, tenantId, githubRef(ref), head, base, title, body),
    mergePullRequest: (env, tenantId, ref, number, precondition) => mergeGitHubPull(env, tenantId, githubRef(ref), number, precondition.expectedHeadSha),
  };

  return {
    provider,
    listRepositories: (env, tenantId) => listOriginRepositories(env, tenantId),
    getRepository: async (env, tenantId, ref) => {
      const result = await listOriginRepositories(env, tenantId) as { repositories?: Array<{ namespace?: string; name?: string }> };
      return result.repositories?.find(r => r.namespace === ref.owner && r.name === ref.repo) ?? null;
    },
    getTree: (env, tenantId, ref, treeRef) => getOriginTree(env, tenantId, originRef(ref), treeRef),
    getBlob: (env, tenantId, ref, sha) => getOriginBlob(env, tenantId, originRef(ref), sha),
    getCommit: (env, tenantId, ref, sha) => getOriginCommit(env, tenantId, originRef(ref), sha),
    listCommits: (env, tenantId, ref, branch) => listOriginCommits(env, tenantId, originRef(ref), branch),
    listPullRequests: (env, tenantId, ref) => listOriginPulls(env, tenantId, originRef(ref)),
    getPullRequest: (env, tenantId, ref, number) => getOriginPull(env, tenantId, originRef(ref), number),
    getPullRequestFiles: (env, tenantId, ref, number) => getOriginPullFiles(env, tenantId, originRef(ref), number),
    createBranch: (env, tenantId, ref, branch, fromSha) => createOriginBranch(env, tenantId, originRef(ref), branch, fromSha),
    commitFiles: (env, tenantId, ref, branch, changes, precondition, message) => commitOriginFiles(env, tenantId, originRef(ref), branch, changes as OriginWriteFile[], precondition.expectedHeadSha, message),
    createPullRequest: (env, tenantId, ref, head, base, title, body) => createOriginPull(env, tenantId, originRef(ref), head, base, title, body),
    mergePullRequest: (env, tenantId, ref, number, precondition) => mergeOriginPull(env, tenantId, originRef(ref), number, precondition.expectedHeadSha),
  };
}
