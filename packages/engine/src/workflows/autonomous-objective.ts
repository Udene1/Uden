import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import type { Env } from '../types';
import { executeTaskGraph, resumeTaskGraph } from '../services/graph-executor';
import { getAutonomousObjective, markObjectiveRun } from '../services/autonomous-objectives';
import { sanitizeError } from '../services/observability';

export interface AutonomousObjectiveWorkflowParams { tenantId:string; objectiveId:string; runId:string; projectId?:string; }
const RUNTIME_POLL='30 seconds', APPROVAL_POLL='5 minutes';

export class AutonomousObjectiveWorkflow extends WorkflowEntrypoint<Env,AutonomousObjectiveWorkflowParams>{
  async run(event:WorkflowEvent<AutonomousObjectiveWorkflowParams>,step:WorkflowStep){
    const {tenantId,objectiveId,runId,projectId}=event.payload;
    let result=await step.do('start autonomous objective',async()=>{
      const objective=await getAutonomousObjective(this.env,tenantId,objectiveId);if(!objective)throw new Error('Autonomous objective not found');
      await markObjectiveRun(this.env,tenantId,runId,'running',{workflowInstanceId:event.instanceId});
      const plan={...objective.plan,nodes:objective.plan.nodes.map(node=>node.kind==='project-tool'&&node.tool==='execute'&&objective.successCriteria?{...node,toolInput:{...(node.toolInput||{}),successCriteria:node.toolInput?.successCriteria||objective.successCriteria}}:node)};
      return executeTaskGraph(this.env,tenantId,plan,projectId||objective.projectId||plan.projectId);
    });
    while(result.status==='awaiting-runtime'||result.status==='awaiting-approval'){
      await step.sleep(result.status==='awaiting-runtime'?'wait for runtime':'wait for approval',result.status==='awaiting-runtime'?RUNTIME_POLL:APPROVAL_POLL);
      result=await step.do('resume autonomous objective',{retries:{limit:3,delay:'10 seconds',backoff:'exponential'}},async()=>resumeTaskGraph(this.env,tenantId,result.graph.id));
    }
    if(result.status==='completed'){await step.do('record objective success',async()=>{await markObjectiveRun(this.env,tenantId,runId,'completed',{graphId:result.graph.id,workflowInstanceId:event.instanceId})});return{status:result.status,graphId:result.graph.id}}
    const error=result.output||`Autonomous objective ended with status ${result.status}`;
    await step.do('record objective failure',async()=>{await markObjectiveRun(this.env,tenantId,runId,'failed',{graphId:result.graph.id,workflowInstanceId:event.instanceId,error:sanitizeError(error)})});return{status:result.status,graphId:result.graph.id,error:sanitizeError(error)};
  }
}
