import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import type { Env } from '../types';
import { executeTaskGraph, resumeTaskGraph } from '../services/graph-executor';
import { getAutonomousObjective, markObjectiveRun } from '../services/autonomous-objectives';
import { verifyRuntimeResult } from '../services/graph-verification';
import { sanitizeError } from '../services/observability';

export interface AutonomousObjectiveWorkflowParams { tenantId:string; objectiveId:string; runId:string; projectId?:string; }
const RUNTIME_POLL='30 seconds', APPROVAL_POLL='5 minutes';

export class AutonomousObjectiveWorkflow extends WorkflowEntrypoint<Env,AutonomousObjectiveWorkflowParams>{
  async run(event:WorkflowEvent<AutonomousObjectiveWorkflowParams>,step:WorkflowStep){
    const {tenantId,objectiveId,runId,projectId}=event.payload;
    const objective=await step.do('load autonomous objective',async()=>{const value=await getAutonomousObjective(this.env,tenantId,objectiveId);if(!value)throw new Error('Autonomous objective not found');return value});
    await step.do('mark workflow running',async()=>{await markObjectiveRun(this.env,tenantId,runId,'running',{workflowInstanceId:event.instanceId})});
    const plan={...objective.plan,nodes:objective.plan.nodes.map(node=>node.kind==='project-tool'&&node.tool==='execute'&&objective.successCriteria?{...node,toolInput:{...(node.toolInput||{}),successCriteria:node.toolInput?.successCriteria||objective.successCriteria}}:node)};
    let result=await step.do('execute autonomous objective',async()=>executeTaskGraph(this.env,tenantId,plan,projectId||objective.projectId||plan.projectId));
    while(result.status==='awaiting-runtime'||result.status==='awaiting-approval'){
      await step.sleep(result.status==='awaiting-runtime'?'wait for runtime':'wait for approval',result.status==='awaiting-runtime'?RUNTIME_POLL:APPROVAL_POLL);
      result=await step.do('resume autonomous objective',{retries:{limit:3,delay:'10 seconds',backoff:'exponential'}},async()=>resumeTaskGraph(this.env,tenantId,result.graph.id));
    }
    if(result.status==='completed'&&objective.successCriteria){
      const verification=result.graph.nodes.filter(node=>node.kind==='project-tool'&&node.tool==='execute').map(node=>verifyRuntimeResult({jobId:node.runtimeJobId||`${result.graph.id}:${node.id}`,status:'succeeded',exitCode:0,output:node.output||''},objective.successCriteria!));
      const failed=verification.find(check=>!check.passed);if(failed){const error=`Objective verification failed: ${failed.reason}`;await step.do('record objective verification failure',async()=>{await markObjectiveRun(this.env,tenantId,runId,'failed',{graphId:result.graph.id,workflowInstanceId:event.instanceId,error:sanitizeError(error)})});return{status:'failed',graphId:result.graph.id,error:sanitizeError(error)}}
    }
    if(result.status==='completed'){await step.do('record objective success',async()=>{await markObjectiveRun(this.env,tenantId,runId,'completed',{graphId:result.graph.id,workflowInstanceId:event.instanceId})});return{status:result.status,graphId:result.graph.id}}
    const error=result.output||`Autonomous objective ended with status ${result.status}`;await step.do('record objective failure',async()=>{await markObjectiveRun(this.env,tenantId,runId,'failed',{graphId:result.graph.id,workflowInstanceId:event.instanceId,error:sanitizeError(error)})});return{status:result.status,graphId:result.graph.id,error:sanitizeError(error)};
  }
}
