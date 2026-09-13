import type { D1Database } from '@cloudflare/workers-types';

type ResolutionRow={id:string;tenant_id:string;graph_id:string;contradiction_id:string;validation_id:string;resolution_reason:string};

export async function resolveValidatedExecutionContradiction(db:D1Database,input:{tenantId:string;graphId:string;contradictionId:string;validationId:string;resolutionReason:string;resolutionRequestId?:string}):Promise<void>{
  const reason=input.resolutionReason.trim();
  if(!reason||reason.length>12000)throw new Error('Invalid contradiction resolution reason');
  const requestId=(input.resolutionRequestId??crypto.randomUUID()).trim();
  if(!requestId||requestId.length>512)throw new Error('Invalid contradiction resolution request id');

  const existing=await db.prepare(`SELECT id,tenant_id,graph_id,contradiction_id,validation_id,resolution_reason
    FROM execution_contradiction_resolutions
    WHERE tenant_id=? AND resolution_request_id=?`).bind(input.tenantId,requestId).first<ResolutionRow>();
  if(existing){
    if(existing.graph_id!==input.graphId||existing.contradiction_id!==input.contradictionId||existing.validation_id!==input.validationId){
      throw new Error('Contradiction resolution request id was already used for a different resolution');
    }
    if(existing.resolution_reason!==reason)throw new Error('Contradiction resolution request id was already used with a different resolution reason');
    return;
  }

  const resolutionId=crypto.randomUUID();
  try{
    const result=await db.batch([
      db.prepare(`INSERT INTO execution_contradiction_resolutions
        (id,tenant_id,graph_id,contradiction_id,validation_id,plan_revision_id,corrective_action_id,executor_principal,validator_principal,resolution_reason,resolution_request_id)
        SELECT ?,v.tenant_id,v.graph_id,c.id,v.id,v.plan_revision_id,a.id,a.executor_principal,v.validator_principal,?,?
        FROM execution_validations v
        JOIN execution_plan_revisions p ON p.id=v.plan_revision_id AND p.status='active'
        JOIN execution_contradictions c ON c.id=v.contradiction_id AND c.status='open'
        JOIN execution_diagnoses d ON d.contradiction_id=c.id AND d.status='accepted'
        JOIN execution_corrective_actions a ON a.id=p.corrective_action_id AND a.diagnosis_id=d.id AND a.status='completed'
        WHERE v.id=? AND v.tenant_id=? AND v.graph_id=? AND v.contradiction_id=? AND v.result='passed'
          AND a.executor_principal IS NOT NULL AND v.validator_principal IS NOT NULL
          AND a.executor_principal <> v.validator_principal`,
      ).bind(resolutionId,reason,requestId,input.validationId,input.tenantId,input.graphId,input.contradictionId),
      db.prepare(`UPDATE execution_contradictions
        SET status='resolved',resolved_at=CURRENT_TIMESTAMP
        WHERE id=? AND tenant_id=? AND graph_id=? AND status='open'
          AND EXISTS (SELECT 1 FROM execution_contradiction_resolutions r WHERE r.id=? AND r.contradiction_id=execution_contradictions.id)`
      ).bind(input.contradictionId,input.tenantId,input.graphId,resolutionId),
    ]);
    const inserted=(result[0] as {meta?:{changes?:number}})?.meta?.changes??0;
    const resolved=(result[1] as {meta?:{changes?:number}})?.meta?.changes??0;
    if(inserted!==1||resolved!==1)throw new Error('Contradiction resolution rejected: validation is stale, non-independent, inactive, incomplete, or already resolved');
  }catch(error){
    const retry=await db.prepare(`SELECT id,tenant_id,graph_id,contradiction_id,validation_id,resolution_reason
      FROM execution_contradiction_resolutions
      WHERE tenant_id=? AND resolution_request_id=?`).bind(input.tenantId,requestId).first<ResolutionRow>();
    if(retry&&retry.graph_id===input.graphId&&retry.contradiction_id===input.contradictionId&&retry.validation_id===input.validationId){
      if(retry.resolution_reason!==reason)throw new Error('Contradiction resolution request id was already used with a different resolution reason');
      return;
    }
    throw error;
  }
}
