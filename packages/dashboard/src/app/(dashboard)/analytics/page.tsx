'use client';
import { useEffect,useState } from 'react';
import { useSession } from 'next-auth/react';
import { api,AnalyticsResponse } from '@/lib/api';
import { formatCurrency,formatNumber } from '@/lib/utils';
import { BarChart2,Activity,Route,ShieldAlert } from 'lucide-react';

export default function AnalyticsPage(){
 const {data:session}=useSession(); const apiKey=(session as any)?.apiKey; const [data,setData]=useState<AnalyticsResponse|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);
 useEffect(()=>{if(!apiKey)return;api.getAnalytics(apiKey).then(setData).catch(e=>setError(e instanceof Error?e.message:'Failed to load analytics')).finally(()=>setLoading(false));},[apiKey]);
 if(loading)return <div className="glass-card p-8">Loading analytics…</div>;
 if(error)return <div className="glass-card p-6 border border-red-500/30 text-red-300">{error}</div>;
 if(!data)return null; const {analytics,savings}=data;
 return <div className="space-y-6">
  <div><h2 className="text-2xl font-bold text-[var(--text-primary)]">Analytics & Reports</h2><p className="text-sm text-[var(--text-secondary)] mt-1">Live tenant-scoped execution, routing and quality data.</p></div>
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><Metric title="Graphs" value={formatNumber(Number(analytics.totals.graphs||0))}/><Metric title="Completed" value={formatNumber(Number(analytics.totals.completed_graphs||0))}/><Metric title="Failed" value={formatNumber(Number(analytics.totals.failed_graphs||0))}/><Metric title="Escalation Attempts" value={formatNumber(Number(analytics.escalation.escalated_attempts||0))}/></div>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
   <Panel icon={<Route size={18}/>} title="Routing economics"><div className="space-y-3 text-sm"><Row label="Actual cost" value={formatCurrency(savings.actualCostCents)}/><Row label="Primary-attempt cost" value={formatCurrency(savings.primaryAttemptCostCents)}/><Row label="Escalation cost" value={formatCurrency(savings.escalationCostCents)}/><Row label="Measured routing savings" value={formatCurrency(savings.routingSavingsCents)}/></div></Panel>
   <Panel icon={<ShieldAlert size={18}/>} title="Quality by domain"><div className="space-y-2">{analytics.byDomain.length?analytics.byDomain.map((x:any)=><div key={x.domain} className="flex justify-between text-sm"><span>{x.domain}</span><span>{Number(x.quality_score||0).toFixed(1)} quality · {formatCurrency(Number(x.cost_cents||0))}</span></div>):<Empty/>}</div></Panel>
   <Panel icon={<BarChart2 size={18}/>} title="Model performance"><div className="space-y-2">{analytics.byModel.length?analytics.byModel.map((x:any)=><div key={x.model} className="grid grid-cols-[1fr_auto_auto] gap-4 text-sm"><span className="font-mono">{x.model}</span><span>{x.attempts} attempts</span><span>{formatCurrency(Number(x.cost_cents||0))}</span></div>):<Empty/>}</div></Panel>
   <Panel icon={<Activity size={18}/>} title="Recent graphs"><div className="space-y-3">{analytics.recentGraphs.length?analytics.recentGraphs.map((x:any)=><div key={x.graph_id} className="border-b border-[var(--border-color)] pb-2"><div className="flex justify-between gap-3"><span className="truncate">{x.goal}</span><span className="text-xs">{x.status}</span></div><div className="text-xs text-[var(--text-secondary)] mt-1">{x.node_count} nodes · {formatCurrency(Number(x.cost_cents||0))} · quality {Number(x.quality_score||0).toFixed(1)}</div></div>):<Empty/>}</div></Panel>
  </div>
 </div>;
}
function Metric({title,value}:{title:string;value:string}){return <div className="glass-card p-5"><div className="text-sm text-[var(--text-secondary)]">{title}</div><div className="text-2xl font-bold mt-2">{value}</div></div>}
function Panel({icon,title,children}:{icon:React.ReactNode;title:string;children:React.ReactNode}){return <div className="glass-card p-6"><div className="flex items-center gap-2 mb-5"><span className="text-[var(--accent-primary)]">{icon}</span><h3 className="text-lg font-semibold">{title}</h3></div>{children}</div>}
function Row({label,value}:{label:string;value:string}){return <div className="flex justify-between"><span className="text-[var(--text-secondary)]">{label}</span><span>{value}</span></div>}
function Empty(){return <div className="text-sm text-[var(--text-secondary)]">No execution data yet.</div>}
