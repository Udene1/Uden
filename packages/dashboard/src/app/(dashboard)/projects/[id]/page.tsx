'use client';

import { useParams } from 'next/navigation';
import { ArrowLeft, Activity, DollarSign, FolderKanban, Workflow } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api, Task } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getTasks().then((result) => setTasks(result.data.filter((task) => task.projectId === id))).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load project work')).finally(() => setLoading(false));
  }, [id]);

  const stats = useMemo(() => ({
    completed: tasks.filter((task) => task.status === 'completed').length,
    failed: tasks.filter((task) => task.status === 'failed').length,
    cost: tasks.reduce((sum, task) => sum + (task.totalCostCents || 0), 0),
  }), [tasks]);

  return (
    <div className="space-y-6 pb-10">
      <header className="flex items-start gap-4">
        <Link href="/projects" className="p-2 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors"><ArrowLeft size={20} /></Link>
        <div className="min-w-0"><p className="text-sm text-[var(--accent-primary)] flex items-center gap-2"><FolderKanban size={15} /> Project</p><h1 className="text-2xl font-semibold text-[var(--text-primary)] mt-1 truncate">{id}</h1><p className="text-xs text-[var(--text-muted)] mt-1">Persisted task linkage</p></div>
        <Link href="/graphs" className="ml-auto btn btn-secondary hidden sm:flex items-center gap-2"><Workflow size={16} /> Graphs</Link>
      </header>

      {error && <div className="glass-card p-4 border border-red-500/30 text-red-300">{error}</div>}
      {loading ? <TableSkeleton rows={5} /> : tasks.length === 0 ? (
        <div className="glass-card p-12 text-center border border-dashed border-[var(--border-color)]"><p className="font-medium text-[var(--text-primary)]">No linked tasks found.</p><p className="text-sm text-[var(--text-secondary)] mt-1">This project ID may no longer be present in the current task history.</p></div>
      ) : <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Metric label="Linked tasks" value={String(tasks.length)} /><Metric label="Completed" value={String(stats.completed)} /><Metric label="Failed" value={String(stats.failed)} /><Metric label="Recorded cost" value={formatCurrency(stats.cost)} /></div>
        <section className="glass-card p-5 border border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-4"><Activity size={17} className="text-[var(--accent-primary)]" /><h2 className="text-lg font-semibold text-[var(--text-primary)]">Work in this project</h2></div>
          <div className="space-y-2">{tasks.map((task) => <Link key={task.id} href={`/tasks/${task.id}`} className="flex flex-col md:flex-row md:items-center gap-3 justify-between rounded-xl border border-[var(--border-color)] p-4 hover:border-[var(--accent-primary)] transition-colors"><div className="min-w-0"><p className="font-medium text-[var(--text-primary)] truncate">{task.prompt}</p><p className="font-mono text-xs text-[var(--text-muted)] mt-1">{task.id} · {formatDate(task.createdAt)}</p></div><div className="flex items-center gap-4 shrink-0"><StatusBadge status={task.status} /><span className="font-mono text-xs text-[var(--text-secondary)]"><DollarSign size={12} className="inline" /> {formatCurrency(task.totalCostCents)}</span></div></Link>)}</div>
        </section>
      </>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="glass-card p-4 border border-[var(--border-color)]"><div className="text-xs text-[var(--text-muted)]">{label}</div><div className="text-lg font-semibold mt-1 text-[var(--text-primary)]">{value}</div></div>;
}
