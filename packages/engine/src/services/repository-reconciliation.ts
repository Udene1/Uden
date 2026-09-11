import type { Env } from '../types';
import { getCodeSource } from './code-source';
import { getRepositoryOperation, completeRepositoryOperation, markRepositoryOperationUnknown, type RepositoryOperationInput } from './repository-operations';

export type RepositoryReconciliation = 'completed'|'still_running'|'indeterminate';

/**
 * Reconciliation is deliberately read-only against the provider. It may only
 * mark success when the provider exposes evidence that uniquely identifies the
 * durable operation. Otherwise the operation remains unknown; callers must not
 * replay it merely because the worker timed out.
 */
export async function reconcileRepositoryOperation(env:Env,tenantId:string,operationId:string,executionOwner:string,executionVersion:number):Promise<RepositoryReconciliation>{
  const operation=await getRepositoryOperation(env.DB,tenantId,operationId);
  if(!operation)return 'indeterminate';
  if(operation.status==='completed')return 'completed';
  if(operation.status!=='unknown'&&operation.status!=='in_flight')return 'indeterminate';
  const op:RepositoryOperationInput={id:operation.id,tenantId:operation.tenantId,graphId:operation.graphId,nodeId:operation.nodeId,executionOwner,executionVersion,repository:operation.repository,branch:operation.branch,operation:operation.operation,expectedHeadSha:operation.expectedHeadSha,idempotencyKey:operation.idempotencyKey};
  const source=getCodeSource(operation.repository.provider);
  try {
    if(operation.operation==='create_pull_request'&&operation.pullRequestNumber){
      const pr=await source.getPullRequest(env,tenantId,operation.repository,operation.pullRequestNumber) as {merged?:boolean;merge_commit_sha?:string|null;state?:string};
      if(pr?.merged===true||pr?.merge_commit_sha){await completeRepositoryOperation(env.DB,op,{resultSha:pr.merge_commit_sha??operation.resultSha,pullRequestNumber:operation.pullRequestNumber});return 'completed';}
      return 'still_running';
    }
    if(operation.operation==='merge_pull_request'&&operation.pullRequestNumber){
      const pr=await source.getPullRequest(env,tenantId,operation.repository,operation.pullRequestNumber) as {merged?:boolean;merge_commit_sha?:string|null;state?:string};
      if(pr?.merged===true&&pr.merge_commit_sha){await completeRepositoryOperation(env.DB,op,{resultSha:pr.merge_commit_sha,pullRequestNumber:operation.pullRequestNumber});return 'completed';}
      return 'still_running';
    }
    if(operation.operation==='create_branch'&&operation.branch){
      const tree=await source.getTree(env,tenantId,operation.repository,operation.branch);
      if(tree){await completeRepositoryOperation(env.DB,op,{resultSha:operation.resultSha});return 'completed';}
      return 'still_running';
    }
    // A commit cannot be proven from a branch-head change alone because another
    // actor may have advanced the branch. Keep it unknown until a provider-side
    // operation identifier or equivalent proof is available.
    await markRepositoryOperationUnknown(env.DB,op,'Provider does not expose sufficient evidence to uniquely reconcile this operation');
    return 'indeterminate';
  } catch(error){
    const message=error instanceof Error?error.message:String(error);
    try{await markRepositoryOperationUnknown(env.DB,op,message);}catch{/* preserve original uncertainty if the recovery lease expires */}
    return 'indeterminate';
  }
}
