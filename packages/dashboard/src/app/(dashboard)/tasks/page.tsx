'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { api, Task } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import ModelPill from '@/components/ui/ModelPill';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getTasks();
        setTasks(res.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const query = search.trim().toLowerCase();
  const visibleTasks = query
    ? tasks.filter((task) => task.id.toLowerCase().includes(query) || task.prompt.toLowerCase().includes(query))
    : tasks;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Tasks</h2>
          <p className="text-sm text-[var(--text-secondary)]">History of all LLM executions across your workspace.</p>
        </div>
        <Link href="/tasks/new" className="btn btn-primary">
          <Plus size={16} /> New Task
        </Link>
      </div>

      <div className="glass-card border border-[var(--border-color)]">
        <div className="p-4 border-b border-[var(--border-color)]">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search prompts or IDs..."
              className="input-field pl-9 py-2 w-full"
            />
          </div>
        </div>

        <div className="p-4">
          {loading ? <TableSkeleton rows={8} /> : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Task ID</th>
                    <th>Status</th>
                    <th>Model</th>
                    <th>Cost</th>
                    <th>Quality</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTasks.map((task) => (
                    <tr key={task.id} className="cursor-pointer hover:bg-[var(--bg-hover)] transition-colors group">
                      <td>
                        <Link href={`/tasks/${task.id}`} className="text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] font-mono text-sm block">
                          {task.id.split('-')[1] || task.id}
                        </Link>
                      </td>
                      <td><StatusBadge status={task.status} /></td>
                      <td><ModelPill model={task.modelUsed || 'Not selected'} /></td>
                      <td className="text-mono">{formatCurrency(task.totalCostCents)}</td>
                      <td>
                        {typeof task.qualityScore === 'number' ? (
                          <div className={`text-xs font-bold ${task.qualityScore > 80 ? 'text-green-500' : 'text-yellow-500'}`}>
                            {task.qualityScore}/100
                          </div>
                        ) : '-'}
                      </td>
                      <td className="text-sm text-[var(--text-secondary)]">{formatDate(task.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visibleTasks.length && (
                <p className="p-6 text-sm text-[var(--text-secondary)]">
                  {query ? 'No tasks match your search.' : 'No tasks found.'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
