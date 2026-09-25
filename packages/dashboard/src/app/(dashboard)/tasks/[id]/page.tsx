'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, BrainCircuit, CheckCircle, Clock3, DollarSign, Info, Radio, RotateCw, ShieldCheck, Workflow, Circle } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import ModelPill from '@/components/ui/ModelPill';
import QualityScore from '@/components/ui/QualityScore';
import ExecutionState from '@/components/ui/ExecutionState';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { api, Task } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

const terminalStatuses = new Set(['completed', 'failed', 'rejected']);
const liveStatuses = new Set(['pending', 'classifying', 'routing', 'processing', 'quality-check', 'escalating', 'approved']);

const lifecycle = [
  { key: 'objective', label: 'Objective', detail: 'Outcome requested', matches: ['pending'] },
  { key: 'classification', label: 'Classification', detail: 'Work is being understood', matches: ['classifying'] },
  { key: 'routing', label: 'Routing', detail: 'Execution path and model selection', matches: ['routing'] },
  { key: 'execution', label: 'Execution', detail: 'Work is running', matches: ['processing', 'approved'] },
  { key: 'approval', label: 'Approval', detail: 'Human boundary, when required', matches: ['awaiting-approval'] },
  { key: 'quality', label: 'Quality check', detail: 'Recorded result is evaluated', matches: ['quality-check'] },
  { key: 'escalation', label: 'Escalation', detail: 'Recovery or stronger execution path', matches: ['escalating'] },
  { key: 'completion', label: 'Completion', detail: 'Completed state recorded', matches: ['completed'] },
  { key: 'failure', label: 'Failure', detail: 'Terminal failure recorded', matches: ['failed', 'rejected'] },
];

function lifecycleIndex(status: string) {
  if (status === 'completed') return 7;
  if (status === 'failed' || status === 'rejected') return 8;
  if (status === 'escalating') return 6;
  if (status === 'quality-check') return 5;
  if (status === 'awaiting-approval') return 4;
  if (['processing', 'approved'].includes(status)) return 3;
  if (status === 'routing') return 2;
  if (status === 'classifying') return 1;
  return 0;
}

function Metric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return <div className="surface p-3"><div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">{icon}{label}</div><div className="mt-1.5 truncate text-sm font-semibold text-[var(--text-primary)]">{value}</div></div>;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-3 last:border-0 last:pb-0"><span className="text-xs text-[var(--text-muted)]">{label}</span><div className="min-w-0 text-right text-sm text-[var(--text-secondary)]">{children}</div></div>;
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
    try { setTask(await api.getTask(id)); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to read the recorded task state.'); }
    finally { if (!silent) setRefreshing(false); }
  }

  useEffect(() => { void loadTask(); }, [id]);
  useEffect(() => {
    if (!task || terminalStatuses.has(task.status) || task.status === 'awaiting-approval') return;
    const timer = window.setInterval(() => void loadTask(true), 5000);
    return () => window.clearInterval(timer);
  }, [id, task?.status]);

  async function approve() {
    if (!task || task.status !== 'awaiting-approval') return;
    setApproving(true); setError(null);
    try { setTask(await api.approveTask(task.id)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to record approval.'); }
    finally { setApproving(false); }
  }

  if (!task) return <div className="p-4 md:p-8">{error ? <div className="surface p-5 text-sm text-[var(--status-danger)]" role="alert">{error}<button type="button" onClick={() => void loadTask()} className="btn btn-secondary mt-4 block">Try again</button></div> : <Skeleton className="h-96 w-full" />}</div>;

  const durationMs = task.completedAt ? new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime() : null;
  const duration = durationMs !== null && durationMs >= 0 ? `${(durationMs / 1000).toFixed(1)}s` : 'In progress';
  const isFailure = task.status === 'failed' || task.status === 'rejected';
  const isLive = liveStatuses.has(task.status);
  const activeStep = lifecycleIndex(task.status);

  return (
    <div className="max-w-7xl space-y-6 pb-28 md:pb-10">
      <header className="page-header">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/tasks" aria-label="Back to work" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"><ArrowLeft size={19} /></Link>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-xl font-semibold text-[var(--text-primary)] md:text-2xl">Task {task.id}</h1><StatusBadge status={task.status} />{isLive && <span className="inline-flex items-center gap-1 text-xs text-[var(--accent-primary)]"><Radio size={12} className="animate-pulse" /> Live</span>}</div><p className="mt-1 truncate text-xs text-[var(--text-muted)]">Created {formatDate(task.createdAt)}{task.completedAt ? ` · completed ${formatDate(task.completedAt)}` : ''}</p></div>
        </div>
        <button type="button" onClick={() => void loadTask()} disabled={refreshing} className="btn btn-secondary hidden sm:inline-flex">{refreshing ? 'Refreshing…' : 'Refresh'}</button>
      </header>

      {error && <div role="alert" className="surface border-[var(--status-danger)]/30 bg-[var(--status-danger)]/5 p-3 text-sm text-[var(--status-danger)]">{error}</div>}
      <ExecutionState status={task.status} />

      <section className="surface p-4 md:p-6" aria-label="Complete execution lifecycle">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="font-semibold text-[var(--text-primary)]">Work lifecycle</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--text-secondary)]">A single view of every operational stage. A stage is marked from the recorded task state; the interface never treats rendering, elapsed time, or output presence as completion.</p></div>
          <Link href="/graphs" className="inline-flex items-center gap-2 text-xs font-medium text-[var(--accent-primary)]">Open graph <Workflow size={13} /></Link>
        </div>
        <div className="mt-6 overflow-x-auto pb-2">
          <div className="flex min-w-[920px] items-start">
            {lifecycle.map((step, index) => {
              const done = !isFailure && activeStep > index;
              const current = activeStep === index;
              const failure = isFailure && index === 8;
              return <div key={step.key} className="relative flex min-w-[102px] flex-1 flex-col items-center text-center">
                {index > 0 && <span className={`absolute left-0 right-1/2 top-4 h-px ${done || current ? 'bg-[var(--accent-primary)]/60' : 'bg-[var(--border-color)]'}`} />}
                {index < lifecycle.length - 1 && <span className={`absolute left-1/2 right-0 top-4 h-px ${done ? 'bg-[var(--accent-primary)]/60' : 'bg-[var(--border-color)]'}`} />}
                <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-[var(--bg-secondary)] ${failure ? 'border-[var(--status-danger)] text-[var(--status-danger)]' : current ? 'border-[var(--accent-primary)] text-[var(--accent-primary)] shadow-[var(--shadow-glow)]' : done ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]' : 'border-[var(--border-color)] text-[var(--text-muted)]'}`}>{failure ? <AlertTriangle size={14} /> : done || current ? <CheckCircle size={14} /> : <Circle size={12} />}</span>
                <span className={`mt-3 text-[11px] font-semibold ${current ? 'text-[var(--text-primary)]' : failure ? 'text-[var(--status-danger)]' : 'text-[var(--text-secondary)]'}`}>{step.label}</span>
                <span className="mt-1 max-w-[100px] text-[9px] leading-4 text-[var(--text-muted)]">{step.detail}</span>
              </div>;
            })}
          </div>
        </div>
      </section>

      {task.status === 'awaiting-approval' && <section className="surface border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 p-4" aria-label="Approval required"><div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 text-[var(--accent-primary)]" /><div><h2 className="text-sm font-semibold text-[var(--text-primary)]">Human approval required</h2><p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">Execution is paused at an enforced approval boundary. Approving records the decision; it does not manufacture a result.</p><button type="button" onClick={approve} disabled={approving} className="btn btn-primary mt-4">{approving ? 'Recording approval…' : 'Approve execution'}</button></div></div></section>}

      {isFailure && <section className="surface border-[var(--status-danger)]/30 bg-[var(--status-danger)]/5 p-4" aria-label="Failed execution"><div className="flex items-start gap-3"><AlertTriangle size={18} className="mt-0.5 text-[var(--status-danger)]" /><div><h2 className="text-sm font-semibold text-[var(--text-primary)]">Failure recorded</h2><p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">This task ended without a completed outcome. Review the durable execution record, node attempts and evidence before choosing recovery.</p><Link href="/graphs" className="btn btn-secondary mt-4 inline-flex items-center gap-2"><RotateCw size={14} /> Review recovery path</Link></div></div></section>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Metric icon={<BrainCircuit size={14} />} label="Model" value={task.modelUsed || 'Not selected'} /><Metric icon={<DollarSign size={14} />} label="Recorded cost" value={formatCurrency(task.totalCostCents)} /><Metric icon={<Clock3 size={14} />} label="Duration" value={duration} /><Metric icon={<ShieldCheck size={14} />} label="Quality" value={typeof task.qualityScore === 'number' ? `${task.qualityScore}/100` : 'Not available'} /></div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          <section className="surface p-4 md:p-6"><h2 className="text-sm font-semibold text-[var(--text-primary)]">Requested outcome</h2><div className="mt-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 text-sm leading-6 text-[var(--text-primary)] whitespace-pre-wrap">{task.prompt}</div></section>
          <section className="surface p-4 md:p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-[var(--text-primary)]">Recorded result</h2>{task.output && <span className="text-xs text-[var(--accent-primary)]">Output stored</span>}</div><div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-primary)]">{task.output || (isLive ? 'Uden is still executing this work. No completed result has been recorded yet.' : isFailure ? 'No verified result was recorded.' : 'No result was recorded.')}</div>{task.output && <div className="mt-4 flex items-start gap-2 border-t border-[var(--border-subtle)] pt-3 text-xs leading-5 text-[var(--text-muted)]"><Info size={13} className="mt-0.5 shrink-0" />Recorded output is evidence that output was stored, not proof of correctness. Execution and verification records remain authoritative.</div>}</section>
        </div>
        <aside className="space-y-5">
          <section className="surface p-4 md:p-6"><h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Execution details</h2><div className="space-y-4"><DetailRow label="Model"><ModelPill model={task.modelUsed || 'Not selected'} /></DetailRow><DetailRow label="Cost"><span className="font-mono">{formatCurrency(task.totalCostCents)}</span></DetailRow><DetailRow label="Mode">{task.mode}</DetailRow><DetailRow label="Project"><span className="font-mono text-xs">{task.projectId || 'Unassigned'}</span></DetailRow><div className="border-t border-[var(--border-subtle)] pt-4 text-center"><span className="text-xs text-[var(--text-muted)]">Quality check</span><div className="mt-2">{typeof task.qualityScore === 'number' ? <QualityScore score={task.qualityScore} size="lg" /> : <span className="text-sm text-[var(--text-secondary)]">Not available</span>}</div></div></div></section>
          <section className="surface p-4 md:p-6"><div className="flex items-center gap-2"><Workflow size={17} className="text-[var(--accent-primary)]" /><h2 className="text-sm font-semibold text-[var(--text-primary)]">Evidence & recovery</h2></div><p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">The durable execution workspace contains the graph, dependencies, recorded attempts, escalation decisions, node outputs, costs, and recovery path.</p><div className="mt-4 flex flex-wrap gap-3"><Link href="/graphs" className="inline-flex items-center gap-2 text-sm text-[var(--accent-primary)]">Execution graph <Workflow size={14} /></Link><Link href="/analytics" className="inline-flex items-center gap-2 text-sm text-[var(--accent-primary)]">System analytics <BarChart3Icon /></Link></div></section>
        </aside>
      </div>
    </div>
  );
}

function BarChart3Icon() { return <span aria-hidden="true" className="text-[10px]">↗</span>; }
