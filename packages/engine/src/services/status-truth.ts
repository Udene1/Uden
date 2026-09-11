export type TruthfulExecutionStatus='running'|'completed'|'failed'|'awaiting-reconciliation';

export function truthfulNodeStatus(input:{persistedStatus:string;unresolvedProvider:boolean;unresolvedRuntime:boolean;unresolvedRepository:boolean}):TruthfulExecutionStatus{
  if(input.unresolvedProvider||input.unresolvedRuntime||input.unresolvedRepository)return 'awaiting-reconciliation';
  if(input.persistedStatus==='completed')return 'completed';
  if(input.persistedStatus==='failed')return 'failed';
  return 'running';
}

/** A terminal claim is valid only when every external effect is proven resolved. */
export function canClaimTerminalStatus(input:{unresolvedProvider:boolean;unresolvedRuntime:boolean;unresolvedRepository:boolean}):boolean{
  return !input.unresolvedProvider&&!input.unresolvedRuntime&&!input.unresolvedRepository;
}
