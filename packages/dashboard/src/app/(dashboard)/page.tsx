'use client';
import { useEffect,useState } from 'react';
import { useSession } from 'next-auth/react';
import { api,UsageSummary,Task } from '@/lib/api';
import { formatCurrency,formatNumber } from '@/lib/utils';
import KPICard from '@/components/ui/KPICard';
import BudgetBar from '@/components/ui/BudgetBar';
import StatusBadge from '@/components/ui/StatusBadge';
import ModelPill from '@/components/ui/ModelPill';
import { CardSkeleton,TableSkeleton } from '@/components/ui/LoadingSkeleton';
import SpendChart from '@/components/charts/SpendChart';
import ModelDistribution from '@/components/charts/ModelDistribution';
import { DollarSign,CheckCircle2,AlertTriangle,PiggyBank,ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DashboardOverview(){
 const {data:session}=useSession(); const apiKey=(session as any)?.apiKey; const [summary,setSummary]=useState<UsageSummary|null>(null); const [recentTasks,setRecentTasks]=useState<Task[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);
 useEffect(()=>{async function load(){if(!apiKey)return;try{const [sum,tasks]=await Promise.all([api.getUsageSummary(apiKey),api.getTasks(apiKey)]);setSummary(sum);setRecentTasks(tasks.data.slice(0,5));}catch(e){setError(e instanceof Error?e.message:'Failed to load dashboard');}finally{setLoading(false);}}load();},[apiKey]);
 return <div className="space-y-6">
  {error&&<div className="glass-card p-4 border border-red-500/30 text-red-300">{error}</div>}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">{loading||!summary?<><CardSkeleton/><CardSkeleton/><CardSkeleton/><CardSkeleton/></>:<>
   <KPICard title="Total Spend" value={formatCurrency(summary.totalCostCents)} icon={DollarSign}/>
   <KPICard title="Tasks Completed" value={formatNumber(summary.completedTasks)} icon={CheckCircle2}/>
   <KPICard title="Escalation Rate" value={`${(summary.escalationRate*100).toFixed(1)}%`} icon={AlertTriangle}/>
   <KPICard title="Routing Savings" value={formatCurrency(summary.savingsEstimateCents)} icon={PiggyBank}/>
  </>}</div>
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 glass-card p-6"><h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Spend Overview</h3><SpendChart/></div><div className="glass-card p-6 space-y-6"><div><h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Budget Status</h3>{loading||!summary?<CardSkeleton/>:<BudgetBar spend={summary.totalCostCents} budget={Math.max(summary.totalCostCents,1)} />}</div><div className="pt-4 border-t border-[var(--border-color)]"><h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Model Usage</h3><ModelDistribution/></div></div></div>
  <div className="glass-card p-6"><div className="flex justify-between items-center mb-6"><h3 className="text-lg font-semibold text-[var(--text-primary)]">Recent Tasks</h3><Link href="/tasks" className="text-sm text-[var(--accent-primary)] hover:underline flex items-center gap-1">View all <ArrowRight size={14}/></Link></div>{loading?<TableSkeleton rows={5}/>:<div className="table-container"><table className="table"><thead><tr><th>Task ID</th><th>Status</th><th>Model</th><th>Cost</th><th>Time</th></tr></thead><tbody>{recentTasks.map(task=><tr key={task.id}><td><Link href={`/tasks/${task.id}`} className="text-[var(--text-primary)] hover:text-[var(--accent-primary)] font-mono text-sm">{task.id.slice(0,12)}</Link></td><td><StatusBadge status={task.status}/></td><td><ModelPill model={task.modelUsed||'—'}/></td><td className="text-mono">{formatCurrency(task.totalCostCents)}</td><td className="text-sm">{new Date(task.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</td></tr>)}</tbody></table></div>}</div>
 </div>;
}
