'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus, RefreshCw, Search, Workflow } from 'lucide-react';
import { api, Task } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';
import ModelPill from '@/components/ui/ModelPill';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

type StatusFilter = 'all' | 'active' | 'approval' | 'completed' | 'failed';
const filters: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All work' },
  { id: 'active', label: 'Active' },
  { id: 'approval', label: 'Needs approval' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
];
const activeStatuses = new Set(['pending', 'planning', 'classifying', 'processing', 'running', 'queued']);
const approvalStatuses = new Set(['awaiting-approval', 'pending-approval']);

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const loadTasks = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try { const res = await api.getTasks(); setTasks(res.data); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load work history.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { void loadTasks(); }, [loadTasks]);
  const q = search.trim().toLowerCase();
  const matchesStatus = (task: Task) => statusFilter === 'all' || (statusFilter === 'active' && activeStatuses.has(task.status)) || (statusFilter === 'approval' && approvalStatuses.has(task.status)) || (statusFilter === 'completed' && task.status === 'completed') || (statusFilter === 'failed' && (task.status === 'failed' || task.status === 'rejected'));
  const visible = tasks.filter((task) => matchesStatus(task) && (!q || task.id.toLowerCase().includes(q) || task.prompt.toLowerCase().includes(q)));
  return <div className="space-y-7 pb-10">
    <header className="flex flex-col sm:flex-row justify-between gap-4"><div><p className="text-sm text-[var(--accent-primary)] flex items-center gap-2"><Workflow size={15}/> Work history</p><h1 className="text-3xl font-semibold text-[var(--text-primary)] mt-2">Tasks</h1><p className="text-sm text-[var(--text-secondary)] mt-1">Every piece of work Uden has planned or executed in this workspace.</p></div><Link href="/tasks/new" className="btn btn-primary flex items-center gap-2"><Plus size={16}/> New work</Link></header>
    <div className="glass-card border border-[var(--border-color)] overflow-hidden">
      <div className="p-4 border-b border-[var(--border-color)] space-y-4"><div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"><div className="relative max-w-xl flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"/><input aria-label="Search work or task IDs" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search work or task IDs…" className="input-field pl-9 py-2 w-full"/></div><button type="button" onClick={() => void loadTasks(true)} disabled={loading || refreshing} className="btn btn-secondary flex items-center justify-center gap-2 disabled:opacity-50" aria-label="Refresh work history"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''}/> Refresh</button></div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter work by status">{filters.map((filter)=><button key={filter.id} type="button" role="tab" aria-selected={statusFilter===filter.id} onClick={()=>setStatusFilter(filter.id)} className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${statusFilter===filter.id?'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]':'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>{filter.label}</button>)}</div></div>
      <div className="p-4">{loading?<TableSkeleton rows={8}/>:error?<div className="rounded-xl border border-[var(--border-color)] p-8 text-center"><p className="font-medium text-[var(--text-primary)]">Work history could not be loaded</p><p className="text-sm text-[var(--text-secondary)] mt-2">{error}</p><button type="button" onClick={() => void loadTasks()} className="btn btn-secondary mt-4">Try again</button></div>:<div className="space-y-2">{visible.map((task)=><Link key={task.id} href={`/tasks/${task.id}`} className="group flex flex-col md:flex-row md:items-center gap-4 rounded-xl border border-[var(--border-color)] p-4 hover:border-[var(--accent-primary)] transition-colors"><div className="min-w-0 flex-1"><div className="font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)]">{task.prompt}</div><div className="font-mono text-xs text-[var(--text-muted)] mt-1">{task.id}</div></div><div className="flex items-center gap-5 shrink-0"><StatusBadge status={task.status}/><ModelPill model={task.modelUsed || 'Not selected'}/><span className="text-sm text-[var(--text-secondary)]">{task.totalCostCents != null ? `$${(task.totalCostCents/100).toFixed(4)}` : '—'}</span><ArrowRight size={15} className="text-[var(--text-muted)]"/></div></Link>)}{!visible.length&&<div className="p-8 text-center"><p className="font-medium text-[var(--text-primary)]">{q || statusFilter !== 'all' ? 'No work matches these filters.' : 'No work has been started yet.'}</p><p className="text-sm text-[var(--text-secondary)] mt-2">{q || statusFilter !== 'all' ? 'Try a different search or status filter.' : 'Start a task and its execution record will appear here.'}</p>{!q && statusFilter==='all' && <Link href="/tasks/new" className="btn btn-primary inline-flex mt-4">Start new work</Link>}</div>}</div>}</div>
    </div>
  </div>;
}
