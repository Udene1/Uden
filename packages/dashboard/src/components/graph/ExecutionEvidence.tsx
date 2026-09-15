import { CheckCircle2, CircleAlert, FileCheck2, ShieldCheck } from 'lucide-react';

type Node = { id:string; title:string; status:string; output?:string; error?:string; approvalState?:string; approvalReason?:string };
type Attempt = { node_id:string; attempt_number:number; model:string; provider?:string; status:string; started_at?:string; completed_at?:string; actual_cost_cents?:number; cost_cents?:number; quality_score?:number; error?:string };

type Props = { nodes:Node[]; attempts:Attempt[] };

export default function ExecutionEvidence({nodes,attempts}:Props){
 const outputs=nodes.filter(n=>Boolean(n.output));
 const errors=nodes.filter(n=>Boolean(n.error)||n.status==='failed');
 const approvals=nodes.filter(n=>n.approvalState==='pending');
 const completedAttempts=attempts.filter(a=>a.status==='completed');
 const evidenceCount=outputs.length+completedAttempts.length+approvals.length+errors.length;
 return <section className="surface p-4 md:p-6" aria-labelledby="execution-evidence-title">
  <div className="flex items-start justify-between gap-4">
   <div><div className="flex items-center gap-2"><FileCheck2 size={17} className="text-[var(--accent-primary)]"/><h2 id="execution-evidence-title" className="font-bold text-lg text-[var(--text-primary)]">Recorded evidence</h2></div><p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl">This section only reflects evidence currently present in the execution record. It does not infer correctness from a model response.</p></div>
   <span className="text-xs text-[var(--text-muted)]">{evidenceCount} recorded signals</span>
  </div>
  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
   <EvidenceItem icon={CheckCircle2} label="Recorded outputs" value={outputs.length} detail="Steps with stored output"/>
   <EvidenceItem icon={CheckCircle2} label="Completed attempts" value={completedAttempts.length} detail="Attempts marked completed"/>
   <EvidenceItem icon={ShieldCheck} label="Approval boundaries" value={approvals.length} detail="Steps awaiting human approval"/>
   <EvidenceItem icon={CircleAlert} label="Failures / errors" value={errors.length} detail="Recorded failure or error signals" danger={errors.length>0}/>
  </div>
 </section>;
}
function EvidenceItem({icon:Icon,label,value,detail,danger=false}:{icon:typeof CheckCircle2;label:string;value:number;detail:string;danger?:boolean}){return <div className="surface-inset p-3"><div className={`flex items-center gap-2 text-xs ${danger?'text-[var(--status-danger)]':'text-[var(--text-muted)]'}`}><Icon size={14}/>{label}</div><div className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{value}</div><p className="text-[11px] text-[var(--text-muted)] mt-1">{detail}</p></div>}
