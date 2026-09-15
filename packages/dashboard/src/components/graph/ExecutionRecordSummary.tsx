import { CheckCircle2, CircleAlert, Clock3, ShieldCheck } from 'lucide-react';

type Props={nodes:number;completed:number;failed:number;awaitingApproval:number;attempts:number};
export default function ExecutionRecordSummary({nodes,completed,failed,awaitingApproval,attempts}:Props){
 const items=[
  {label:'Recorded steps',value:String(nodes),icon:Clock3},
  {label:'Completed',value:`${completed}/${nodes}`,icon:CheckCircle2},
  {label:'Needs approval',value:String(awaitingApproval),icon:ShieldCheck},
  {label:'Failed',value:String(failed),icon:CircleAlert},
  {label:'Attempts recorded',value:String(attempts),icon:Clock3},
 ];
 return <div className="grid grid-cols-2 gap-2 md:grid-cols-5">{items.map(({label,value,icon:Icon})=><div key={label} className="surface-inset p-3"><div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]"><Icon size={13}/>{label}</div><div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{value}</div></div>)}</div>;
}
