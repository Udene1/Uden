'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BrainCircuit,
  CheckCircle,
  Circle,
  CircleDashed,
  Clock3,
  DollarSign,
  Info,
  Radio,
  RotateCw,
  ShieldCheck,
  Workflow,
  XCircle,
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import ModelPill from '@/components/ui/ModelPill';
import QualityScore from '@/components/ui/QualityScore';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { api, Task } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

const terminalStatuses = new Set(['completed', 'failed', 'rejected']);
const lifecycle = [
  { key: 'queued', label: 'Queued', detail: 'Recorded and waiting' },
  { key: 'running', label: 'Executing', detail: 'Work is running' },
  { key: 'completed', label: 'Verified', detail: 'Outcome recorded' },
];

function lifecycleIndex(status: string) {
  if (status === 'completed') return 2;
  if (status === 'failed' || status === 'rejected') return -1;
  if (status === 'running') return 1;
  return 0;
}

function ExecutionTruth({ status }: { status: string }) {
  const states: Record<string, { label: string; detail: string; icon: typeof Clock3 }> = {
    queued: {
      label: 'Recorded · queued',
      detail: 'Accepted by the execution system; work has not completed.',
      icon: Clock3,
    },
    running: {
      label: 'Recorded · executing',
      detail: 'Execution is in progress. Completion has not been recorded.',
      icon: CircleDashed,
    },
    'awaiting-approval': {
      label: 'Human approval required',
      detail: 'Execution is paused at an enforced approval boundary.',
      icon: ShieldCheck,
    },
    completed: {
      label: 'Verified result recorded',
      detail: 'The execution system recorded a completed outcome.',
      icon: CheckCircle,
    },
    failed: {
      label: 'Execution failed',
      detail: 'No verified result was recorded for this run.',
      icon: XCircle,
    },
    rejected: {
      label: 'Execution rejected',
      detail: 'The execution did not produce a verified result.',
      icon: XCircle,
    },
  };

  const state = states[status] ?? {
    label: `Recorded · ${status}`,
    detail: 'This state is read from the execution system.',
    icon: Clock3,
  };
  const Icon = state.icon;
  const good = status === 'completed';
  const bad = status === 'failed' || status === 'rejected';

  return (
    <div
      className={`rounded-xl border p-3 ${
        good
          ? 'border-emerald-500/25 bg-emerald-500/5'
          : bad
            ? 'border-red-500/25 bg-red-500/5'
            : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'
      }`}
      role="status"
    >
      <div className="flex items-start gap-2.5">
        <Icon
          size={16}
          className={good ? 'text-emerald-400' : bad ? 'text-red-400' : 'text-[var(--accent-primary)]'}
        />
        <div>
          <p className="text-xs font-semibold text-[var(--text-primary)]">{state.label}</p>
          <p className="mt-0.5 text-[11px] leading-5 text-[var(--text-secondary)]">{state.detail}</p>
        </div>
      </div>
    </div>
  );
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
      setTask(await api.getTask(id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task');
    } finally {
      if (!silent) setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadTask();
  }, [id]);

  useEffect(() => {
    if (!task || terminalStatuses.has(task.status) || task.status === 'awaiting-approval') return;
    const timer = window.setInterval(() => void loadTask(true), 5000);
    return () => window.clearInterval(timer);
  }, [id, task?.status]);

  async function approve() {
    if (!task) return;
    setApproving(true);
    setError(null);
    try {
      setTask(await api.approveTask(task.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve task');
    } finally {
      setApproving(false);
    }
  }

  if (!task) {
    return (
      <div className="p-4 md:p-8">
        {error ? <p className="text-sm text-red-400" role="alert">{error}</p> : <Skeleton className="h-96 w-full" />}
      </div>
    );
  }

  const durationMs = task.completedAt
    ? new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime()
    : null;
  const duration = durationMs !== null && durationMs >= 0 ? `${(durationMs / 1000).toFixed(1)}s` : 'In progress';
  const isLive = !terminalStatuses.has(task.status) && task.status !== 'awaiting-approval';
  const activeStep = lifecycleIndex(task.status);
  const isFailure = task.status === 'failed' || task.status === 'rejected';

  return (
    <div className="max-w-6xl space-y-5 pb-28 md:space-y-6 md:pb-10">
      <header
        className="sticky top-0 z-20 -mx-4 border-b bg-[var(--bg-primary)]/95 px-4 py-3 backdrop-blur-xl md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-3">
          <Link href="/tasks" aria-label="Back to tasks" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
            <ArrowLeft size={19} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-bold text-[var(--text-primary)] md:text-2xl">Task {task.id}</h1>
              <StatusBadge status={task.status} />
              {isLive && <span className="flex items-center gap-1 text-xs text-[var(--accent-primary)]"><Radio size={12} className="animate-pulse" /> Live</span>}
            </div>
            <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
              Created {formatDate(task.createdAt)}{task.completedAt ? ` · completed ${formatDate(task.completedAt)}` : ''}
            </p>
          </div>
          <button type="button" onClick={() => void loadTask()} disabled={refreshing} className="btn btn-secondary hidden shrink-0 sm:inline-flex">
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400">{error}</div>}
      <ExecutionTruth status={task.status} />

      <section className="glass-card border border-[var(--border-color)] p-4 md:p-5" aria-label="Task lifecycle">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">Execution lifecycle</h2>
            <p className="mt-1 max-w-2xl text-xs text-[var(--text-secondary)]">This timeline is driven by recorded task state. Acceptance alone never advances it.</p>
          </div>
          {isFailure && <span className="hidden text-xs text-red-400 sm:block">Execution stopped</span>}
        </div>
        <div className="space-y-3 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
          {lifecycle.map((step, index) => {
            const done = !isFailure && activeStep >= index;
            const current = !isFailure && activeStep === index;
            return (
              <div key={step.key} className="relative flex items-center gap-3 md:block">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${done ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 text-[var(--accent-primary)]' : 'border-[var(--border-color)] text-[var(--text-muted)]'}`}>
                  {done ? <CheckCircle size={15} /> : <Circle size={15} />}
                </span>
                <div className="min-w-0 md:mt-2">
                  <span className={`text-sm ${current ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{step.label}</span>
                  <span className="block text-[11px] text-[var(--text-muted)]">{step.detail}</span>
                </div>
                {index < lifecycle.length - 1 && <div className={`absolute left-4 top-8 h-3 w-px md:left-8 md:top-4 md:h-px md:w-[calc(100%-1rem)] ${!isFailure && activeStep > index ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-color)]'}`} />}
              </div>
            );
          })}
        </div>

        {task.status === 'awaiting-approval' && (
          <div className="mt-5 rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]"><ShieldCheck size={16} className="text-[var(--accent-primary)]" /> Approval required before execution</div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">This task is paused at an enforced execution boundary. Approval changes recorded state; it does not dismiss a UI prompt.</p>
            <button type="button" className="btn btn-primary mt-4 w-full sm:w-auto" onClick={approve} disabled={approving}><CheckCircle size={15} />{approving ? 'Approving…' : 'Approve execution'}</button>
          </div>
        )}

        {isFailure && (
          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]"><AlertTriangle size={15} className="text-red-400" /> Execution did not reach a verified result.</div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Inspect the recorded graph and attempt history before choosing recovery.</p>
            <Link href="/graphs" className="btn btn-secondary mt-4 inline-flex items-center gap-2"><RotateCw size={15} /> Review recovery path</Link>
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric icon={<BrainCircuit size={14} />} label="Model" value={task.modelUsed || 'Not selected'} />
        <Metric icon={<DollarSign size={14} />} label="Recorded cost" value={formatCurrency(task.totalCostCents)} />
        <Metric icon={<Clock3 size={14} />} label="Duration" value={duration} />
        <Metric icon={<ShieldCheck size={14} />} label="Quality" value={typeof task.qualityScore === 'number' ? `${task.qualityScore}/100` : 'Not available'} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr] md:gap-6">
        <div className="space-y-5 md:space-y-6">
          <section className="glass-card space-y-3 border border-[var(--border-color)] p-4 md:p-6">
            <h2 className="text-sm font-medium uppercase tracking-wider text-[var(--text-secondary)]">Requested outcome</h2>
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 text-sm leading-6 text-[var(--text-primary)] whitespace-pre-wrap">{task.prompt}</div>
          </section>
          <section className="glass-card space-y-3 border border-[var(--border-color)] p-4 md:p-6">
            <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-medium uppercase tracking-wider text-[var(--text-secondary)]">Result</h2>{task.output && <span className="text-xs text-[var(--accent-primary)]">Recorded output</span>}</div>
            <div className="whitespace-pre-wrap text-sm leading-6 text-[var(--text-primary)]">{task.output || (isLive ? 'Uden is still executing this work. The result will appear here when the execution system records it.' : isFailure ? 'No verified result was recorded.' : 'No result generated.')}</div>
            {task.output && <div className="flex items-center gap-2 border-t border-[var(--border-color)] pt-3 text-xs text-[var(--text-muted)]"><Info size={13} /> Output presence does not independently prove correctness; verification state is authoritative.</div>}
          </section>
        </div>

        <aside className="space-y-5 md:space-y-6">
          <section className="glass-card border border-[var(--border-color)] p-4 md:p-6">
            <h2 className="mb-4 text-sm font-medium text-[var(--text-primary)]">Execution details</h2>
            <div className="space-y-4">
              <Row icon={<BrainCircuit size={16} />} label="Selected model"><ModelPill model={task.modelUsed || 'Not selected'} /></Row>
              <Row icon={<DollarSign size={16} />} label="Recorded cost"><span className="font-mono text-sm font-medium">{formatCurrency(task.totalCostCents)}</span></Row>
              <Row label="Mode"><span className="text-sm">{task.mode}</span></Row>
              <Row label="Project"><span className="max-w-40 truncate font-mono text-xs">{task.projectId || 'Unassigned'}</span></Row>
              <div className="flex flex-col items-center border-t border-[var(--border-color)] pt-3"><span className="mb-2 text-xs text-[var(--text-secondary)]">Quality check score</span>{typeof task.qualityScore === 'number' ? <QualityScore score={task.qualityScore} size="lg" /> : <span className="text-sm text-[var(--text-secondary)]">Not available</span>}</div>
            </div>
          </section>
          <section className="glass-card border border-[var(--border-color)] p-4 md:p-6">
            <div className="mb-2 flex items-center gap-2"><Workflow size={17} className="text-[var(--accent-primary)]" /><h2 className="text-sm font-medium text-[var(--text-primary)]">Execution trail</h2></div>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">Dependencies, attempts, escalation decisions, node outputs, cost and timeline data are available in the Graphs workspace.</p>
            <Link href="/graphs" className="mt-4 inline-flex text-sm text-[var(--accent-primary)]">Open execution graphs →</Link>
          </section>
        </aside>
      </div>

      <div className="sm:hidden"><button type="button" onClick={() => void loadTask()} disabled={refreshing} className="btn btn-secondary w-full justify-center">{refreshing ? 'Refreshing…' : 'Refresh recorded state'}</button></div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return <div className="glass-card border border-[var(--border-color)] p-3.5 md:p-4"><div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">{icon}{label}</div><div className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">{value}</div></div>;
}

function Row({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3"><div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">{icon}{label}</div>{children}</div>;
}
