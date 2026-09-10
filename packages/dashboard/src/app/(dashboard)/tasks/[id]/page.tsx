'use client';

import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, BrainCircuit, DollarSign, Radio, ShieldCheck, Workflow, Circle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import ModelPill from '@/components/ui/ModelPill';
import QualityScore from '@/components/ui/QualityScore';
import { formatCurrency, formatDate } from '@/lib/utils';
import { api, Task } from '@/lib/api';
import { Skeleton } from '@/components/ui/LoadingSkeleton';

const terminalStatuses = new Set(['completed', 'failed', 'rejected']);
const lifecycle = [
  { key: 'queued', label: 'Queued' },
  { key: 'running', label: 'Executing' },
  { key: 'completed', label: 'Verified' },
];

function lifecycleIndex(status: string) {
  if (status === 'completed') return 2;
  if (status === 'failed' || status === 'rejected') return -1;
  if (status === 'awaiting-approval') return 0;
  if (status === 'running') return 1;
  return 0;
}

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function loadTask(silent = false) {
    if (!id) return;
    if (!silent) setRefreshing(true);
    try {
      const next = await api.getTask(id);
      setTask(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task');
    } finally {
      if (!silent) setRefreshing(false);
    }
  }

  useEffect(() => { void loadTask(); }, [id]);

  useEffect(() => {
    if (!task || terminalStatuses.has(task.status) || task.status === 'awaiting-approval') return;
    const timer = window.setInterval(() => { void loadTask(true); }, 5000);
    return () => window.clearInterval(timer);
  }, [id, task?.status]);

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

  if (!task) return <div className="p-8">{error ? <p className="text-sm text-red-400">{error}</p> : <Skeleton className="h-96 w-full" />}</div>;

  const durationMs = task.completedAt ? new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime() : null;
  const duration = durationMs !== null && durationMs >= 0 ? `${(durationMs / 1000).toFixed(1)}s` : 'In progress';
  const isLive = !terminalStatuses.has(task.status) && task.status !== 'awaiting-approval';
  const activeStep = lifecycleIndex(task.status);
  const isFailure = task.status === 'failed' || task.status === 'rejected';

  return (
    <div className="space-y-6 max-w-6xl pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-2">
        <Link href="/tasks" aria-label="Back to tasks" className="p-2 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors"><ArrowLeft size={20} /></Link>
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold text-[var(--text-primary)]">Task {task.id}</h1><StatusBadge status={task.status} />{isLive && <span className="text-xs text-[var(--accent-primary)] flex items-center gap-1"><Radio size={12} className="animate-pulse" /> Live</span>}</div><p className="text-sm text-[var(--text-secondary)]">Created {formatDate(task.createdAt)}{task.completedAt ? ` · completed ${formatDate(task.completedAt)}` : ''}</p></div>
        <div className="sm:ml-auto flex gap-2"><button type="button" onClick={() => void loadTask()} disabled={refreshing} className="btn btn-secondary">{refreshing ? 'Refreshing…' : 'Refresh'}</button>{task.status === 'awaiting-approval' && <button type="button" className="btn btn-primary" onClick={approve} disabled={approving}><CheckCircle size={16} />{approving ? 'Approving…' : 'Approve execution'}</button>}</div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400">{error}</div>}

      <section className="glass-card border border-[var(--border-color)] p-5" aria-label="Task lifecycle">
        <div className="flex items-center justify-between gap-4 mb-5"><div><h2 className="font-semibold text-[var(--text-primary)]">Execution lifecycle</h2><p className="text-xs text-[var(--text-secondary)] mt-1">Track where this work is now. Uden records the outcome rather than implying completion before it is recorded.</p></div>{isFailure && <span className="text-xs text-red-400">Execution stopped</span>}</div>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {lifecycle.map((step, index) => { const done = !isFailure && activeStep >= index; const current = !isFailure && activeStep === index; return <div key={step.key} className="relative"><div className="flex items-center gap-2"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${done ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]' : 'border-[var(--border-color)] text-[var(--text-muted)]'}`}>{done ? <CheckCircle size={14} /> : <Circle size={14} />}</span><span className={`text-xs sm:text-sm ${current ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{step.label}</span></div>{index < lifecycle.length - 1 && <div className={`absolute left-7 right-[-1rem] top-3.5 h-px ${!isFailure && activeStep > index ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-color)]'}`} />}</div>; })}
        </div>
        {task.status === 'awaiting-approval' && <div className="mt-5 rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 p-4"><div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]"><ShieldCheck size={16} className="text-[var(--accent-primary)]" /> Approval required before execution</div><p className="text-xs text-[var(--text-secondary)] mt-1">This task is paused at the execution boundary. Approve it to let the recorded execution continue.</p></div>}
        {isFailure && <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/5 p-4"><div className="text-sm font-medium text-[var(--text-primary)]">Execution did not reach a verified result.</div><p className="text-xs text-[var(--text-secondary)] mt-1">Review the recorded error or execution graph before deciding whether to retry.</p></div>}
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric icon={<BrainCircuit size={14} />} label="Model" value={task.modelUsed || 'Not selected'} />
        <Metric icon={<DollarSign size={14} />} label="Recorded cost" value={formatCurrency(task.totalCostCents)} />
        <Metric label="Duration" value={duration} />
        <Metric icon={<ShieldCheck size={14} />} label="Quality" value={typeof task.qualityScore === 'number' ? `${task.qualityScore}/100` : 'Not available'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
        <div className="space-y-6">
          <section className="glass-card p-6 border border-[var(--border-color)] space-y-3"><h2 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Requested outcome</h2><div className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-sm text-[var(--text-primary)] whitespace-pre-wrap">{task.prompt}</div></section>
          <section className="glass-card p-6 border border-[var(--border-color)] space-y-3"><div className="flex items-center justify-between"><h2 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Result</h2>{task.output && <span className="text-xs text-[var(--accent-primary)]">Recorded output</span>}</div><div className="prose prose-invert max-w-none text-sm text-[var(--text-primary)] whitespace-pre-wrap">{task.output || (isLive ? 'Uden is still executing this work. The result will appear here when recorded.' : 'No result generated.')}</div></section>
        </div>

        <aside className="space-y-6">
          <section className="glass-card p-6 border border-[var(--border-color)]"><h2 className="text-sm font-medium text-[var(--text-primary)] mb-4">Execution details</h2><div className="space-y-4"><Row icon={<BrainCircuit size={16} />} label="Selected model"><ModelPill model={task.modelUsed || 'Not selected'} /></Row><Row icon={<DollarSign size={16} />} label="Cost"><span className="font-mono font-medium">{formatCurrency(task.totalCostCents)}</span></Row><Row label="Mode"><span className="text-sm">{task.mode}</span></Row><Row label="Project"><span className="font-mono text-xs">{task.projectId || 'Unassigned'}</span></Row><div className="pt-3 border-t border-[var(--border-color)] flex flex-col items-center"><span className="text-xs text-[var(--text-secondary)] mb-2">Quality check score</span>{typeof task.qualityScore === 'number' ? <QualityScore score={task.qualityScore} size="lg" /> : <span className="text-sm text-[var(--text-secondary)]">Not available</span>}</div></div></section>
          <section className="glass-card p-6 border border-[var(--border-color)]"><div className="flex items-center gap-2 mb-2"><Workflow size={17} className="text-[var(--accent-primary)]" /><h2 className="text-sm font-medium text-[var(--text-primary)]">Execution trail</h2></div><p className="text-xs text-[var(--text-secondary)] leading-relaxed">Detailed dependency graphs, model attempts, escalation decisions, node outputs, cost and timeline data are available in the Graphs workspace when a graph has been recorded for this execution.</p><Link href="/graphs" className="mt-4 inline-flex items-center text-sm text-[var(--accent-primary)]">Open execution graphs →</Link></section>
        </aside>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) { return <div className="glass-card p-4 border border-[var(--border-color)]"><div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">{icon}{label}</div><div className="mt-1 text-sm font-semibold text-[var(--text-primary)] truncate">{value}</div></div>; }
function Row({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) { return <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--border-color)]"><div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">{icon}{label}</div>{children}</div>; }
