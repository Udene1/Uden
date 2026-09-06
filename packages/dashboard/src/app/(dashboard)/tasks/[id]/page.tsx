'use client';

import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, BrainCircuit, DollarSign } from 'lucide-react';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import ModelPill from '@/components/ui/ModelPill';
import QualityScore from '@/components/ui/QualityScore';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { api, Task } from '@/lib/api';
import { Skeleton } from '@/components/ui/LoadingSkeleton';

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (!id) return;
    setError(null);
    api.getTask(id).then(setTask).catch((err) => setError(err instanceof Error ? err.message : 'Failed to load task'));
  }, [id]);

  const approve = async () => {
    if (!task) return;
    setApproving(true);
    setError(null);
    try {
      const updated = await api.approveTask(task.id);
      setTask(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve task');
    } finally {
      setApproving(false);
    }
  };

  if (!task) {
    return (
      <div className="p-8">
        {error ? <p className="text-sm text-red-400">{error}</p> : <Skeleton className="h-96 w-full" />}
      </div>
    );
  }

  const durationMs = task.completedAt ? new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime() : null;
  const duration = durationMs !== null && durationMs >= 0 ? `${(durationMs / 1000).toFixed(1)}s` : '—';

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/tasks" className="p-2 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Task {task.id}</h2>
            <StatusBadge status={task.status} />
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{formatDate(task.createdAt)}</p>
        </div>

        {task.status === 'awaiting-approval' && (
          <div className="ml-auto">
            <button className="btn btn-primary" onClick={approve} disabled={approving}>
              <CheckCircle size={16} />
              {approving ? 'Approving…' : 'Approve Execution'}
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card p-6 border border-[var(--border-color)] space-y-3">
            <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Prompt</h3>
            <div className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] font-mono text-sm text-[var(--text-primary)] whitespace-pre-wrap">
              {task.prompt}
            </div>
          </div>

          <div className="glass-card p-6 border border-[var(--border-color)] space-y-3">
            <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Result</h3>
            <div className="prose prose-invert max-w-none text-sm text-[var(--text-primary)] whitespace-pre-wrap">
              {task.output || 'No result generated yet.'}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 border border-[var(--border-color)]">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">Execution Details</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
                  <BrainCircuit size={16} /> Model
                </div>
                <ModelPill model={task.modelUsed || 'Not selected'} />
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
                  <DollarSign size={16} /> Cost
                </div>
                <span className="font-mono font-medium text-[var(--text-primary)]">
                  {formatCurrency(task.totalCostCents)}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                <div className="text-[var(--text-secondary)] text-sm">Duration</div>
                <span className="font-mono text-[var(--text-primary)]">{duration}</span>
              </div>

              <div className="pt-2 flex flex-col items-center">
                <span className="text-xs text-[var(--text-secondary)] mb-2">Quality Check Score</span>
                {typeof task.qualityScore === 'number' ? <QualityScore score={task.qualityScore} size="lg" /> : <span className="text-sm text-[var(--text-secondary)]">Not available</span>}
              </div>
            </div>
          </div>

          <div className="glass-card p-6 border border-[var(--border-color)]">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">Routing</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              The model and cost shown here come from the task execution record. No estimated savings or routing claims are shown unless the engine has recorded them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
