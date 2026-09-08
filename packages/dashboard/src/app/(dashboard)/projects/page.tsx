'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, FolderKanban, Plus, Search } from 'lucide-react';
import { api, Task } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { formatCurrency } from '@/lib/utils';

type ProjectSummary = { id: string; tasks: Task[] };

export default function ProjectsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getTasks().then((result) => setTasks(result.data)).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load projects')).finally(() => setLoading(false));
  }, []);

  const projects = useMemo<ProjectSummary[]>(() => {
    const grouped = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.projectId) continue;
      grouped.set(task.projectId, [...(grouped.get(task.projectId) || []), task]);
    }
    return Array.from(grouped, ([id, projectTasks]) => ({ id, tasks: projectTasks })).sort((a, b) => b.tasks.length - a.tasks.length);
  }, [tasks]);

  const query = search.trim().toLowerCase();
  const visible = projects.filter((project) => project.id.toLowerCase().includes(query));

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--accent-primary)] flex items-center gap-2"><FolderKanban size={15} /> Persistent workspaces</p>
          <h1 className="text-3xl font-semibold text-[var(--text-primary)] mt-2">Projects</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">Projects are derived from persisted task-to-project linkage. No fabricated project records, budgets, or activity are shown.</p>
        </div>
        <Link href="/tasks/new" className="btn btn-primary flex items-center gap-2"><Plus size={16} /> New work</Link>
      </header>

      <div className="glass-card border border-[var(--border-color)] p-4">
        <div className="relative max-w-xl"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search project IDs…" className="input-field pl-9 py-2 w-full" /></div>
      </div>

      {error && <div className="glass-card p-4 border border-red-500/30 text-red-300">{error}</div>}
      {loading ? <TableSkeleton rows={6} /> : visible.length === 0 ? (
        <div className="glass-card p-12 text-center border border-dashed border-[var(--border-color)]">
          <FolderKanban className="mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="font-medium text-[var(--text-primary)]">{search ? 'No matching projects.' : 'No linked projects yet.'}</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Start work and attach it to a project when project linkage is available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((project) => {
            const completed = project.tasks.filter((task) => task.status === 'completed').length;
            const cost = project.tasks.reduce((sum, task) => sum + (task.totalCostCents || 0), 0);
            const latest = project.tasks[0];
            return <Link key={project.id} href={`/projects/${project.id}`} className="glass-card p-5 border border-[var(--border-color)] flex flex-col gap-4 group hover:border-[var(--accent-primary)] transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0"><div className="p-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--accent-primary)]"><FolderKanban size={20} /></div><div className="min-w-0"><h2 className="font-semibold text-[var(--text-primary)] truncate">{project.id}</h2><p className="text-xs text-[var(--text-muted)] font-mono truncate">{project.tasks.length} linked task{project.tasks.length === 1 ? '' : 's'}</p></div></div><ArrowRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)]" />
              </div>
              <div className="grid grid-cols-3 gap-2"><Metric icon={<Activity size={12} />} label="Tasks" value={String(project.tasks.length)} /><Metric label="Done" value={String(completed)} /><Metric label="Cost" value={formatCurrency(cost)} /></div>
              {latest && <div className="pt-3 border-t border-[var(--border-color)]"><p className="text-xs text-[var(--text-muted)] mb-1">Latest linked work</p><p className="text-sm text-[var(--text-primary)] truncate">{latest.prompt}</p><div className="mt-2"><StatusBadge status={latest.status} /></div></div>}
            </Link>;
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3"><div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">{icon}{label}</div><div className="text-sm font-semibold mt-1 text-[var(--text-primary)]">{value}</div></div>;
}
