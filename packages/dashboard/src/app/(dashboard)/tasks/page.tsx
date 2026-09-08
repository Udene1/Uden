'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus, Search, Workflow } from 'lucide-react';
import { api, Task } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';
import ModelPill from '@/components/ui/ModelPill';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  useEffect(() => { api.getTasks().then((res) => setTasks(res.data)).finally(() => setLoading(false)); }, []);
  const q = search.trim().toLowerCase();
  const visible = q ? tasks.filter((t) => t.id.toLowerCase().includes(q) || t.prompt.toLowerCase().includes(q)) : tasks;
  return <div className="space-y-7 pb-10">
    <header className="flex flex-col sm:flex-row justify-between gap-4"><div><p className="text-sm text-[var(--accent-primary)] flex items-center gap-2"><Workflow size={15}/> Work history</p><h1 className="text-3xl font-semibold text-[var(--text-primary)] mt-2">Tasks</h1><p className="text-sm text-[var(--text-secondary)] mt-1">Every piece of work Uden has planned or executed in this workspace.</p></div><Link href="/tasks/new" className="btn btn-primary flex items-center gap-2"><Plus size={16}/> New work</Link></header>
    <div className="glass-card border border-[var(--border-color)] overflow-hidden"><div className="p-4 border-b border-[var(--border-color)]"><div className="relative max-w-xl"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search work or task IDs…" className="input-field pl-9 py-2 w-full"/></div></div><div className="p-4">{loading?<TableSkeleton rows={8}/>:<div className="space-y-2">{visible.map((task)=><Link key={task.id} href={`/tasks/${task.id}`} className="group flex flex-col md:flex-row md:items-center gap-4 rounded-xl border border-[var(--border-color)] p-4 hover:border-[var(--accent-primary)] transition-colors"><div className="min-w-0 flex-1"><div className="font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)]">{task.prompt}</div><div className="font-mono text-xs text-[var(--text-muted)] mt-1">{task.id}</div></div><div className="flex items-center gap-5 shrink-0"><StatusBadge status={task.status}/><ModelPill model={task.modelUsed || 'Not selected'}/><span className="text-sm text-[var(--text-secondary)]">{task.totalCostCents != null ? `$${(task.totalCostCents/100).toFixed(4)}` : '—'}</span><ArrowRight size={15} className="text-[var(--text-muted)]"/></div></Link>)}{!visible.length&&<p className="p-8 text-center text-sm text-[var(--text-secondary)]">{q?'No work matches your search.':'No work has been started yet.'}</p>}</div>}</div></div>
  </div>;
}
