'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Activity, ArrowRight, Bot, CheckCircle2, CircleDot, Clock3, DollarSign, Loader2, Plus, ShieldCheck, Sparkles, Workflow, Zap } from 'lucide-react';
import { api, Task, TaskMode, TaskStatus, UsageSummary } from '@/lib/api';
import { getGraph, getGraphs } from '@/lib/graph-api';
import StatusBadge from '@/components/ui/StatusBadge';
import { CardSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { formatCurrency, formatNumber } from '@/lib/utils';

type Graph = { id: string; goal?: string; status?: string; nodes?: Array<{ id: string; title: string; status: string; selectedModel?: string }> };

const starters = [
  'Research a topic and produce a decision brief with sources.',
  'Analyze this project and identify the highest-risk issues.',
  'Turn these requirements into an implementation plan.',
];

const graphStatusToTaskStatus = (status?: string): TaskStatus => {
  switch (status) {
    case 'completed': return 'completed';
    case 'failed': return 'failed';
    case 'awaiting-approval': return 'awaiting-approval';
    case 'approved': return 'approved';
    case 'rejected': return 'rejected';
    case 'running':
    case 'executing':
    case 'processing': return 'processing';
    case 'routing': return 'routing';
    case 'quality-check': return 'quality-check';
    case 'escalating': return 'escalating';
    case 'ready':
    case 'pending': return 'pending';
    default: return 'pending';
  }
};

export default function DashboardOverview() {
  const { data: session } = useSession();
  const apiKey = (session as any)?.apiKey as string | undefined;
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<TaskMode>('permission-based');
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [latestGraph, setLatestGraph] = useState<Graph | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadWorkspace() {
    if (!apiKey) { setLoading(false); return; }
    try {
      const [tasksResult, usageResult, graphResult] = await Promise.all([api.getTasks(apiKey), api.getUsageSummary(apiKey), getGraphs()]);
      setRecentTasks(tasksResult.data.slice(0, 5));
      setUsage(usageResult);
      const first = graphResult.graphs?.[0];
      setLatestGraph(first?.id ? (await getGraph(first.id)).graph : null);
      setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load your workspace.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadWorkspace(); }, [apiKey]);

  async function createTask() {
    const value = prompt.trim();
    if (!value || !apiKey || creating) return;
    setCreating(true); setError(null);
    try { const task = await api.createTask(value, mode, undefined, apiKey); setPrompt(''); setRecentTasks((current) => [task, ...current.filter((item) => item.id !== task.id)].slice(0, 5)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to start the work.'); }
    finally { setCreating(false); }
  }

  const graphStats = useMemo(() => {
    const nodes = latestGraph?.nodes || [];
    return { nodes: nodes.length, completed: nodes.filter((node) => node.status === 'completed').length, running: nodes.filter((node) => node.status === 'running').length };
  }, [latestGraph]);

  return <div className="space-y-7 pb-10">
    <section className="relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 md:p-8 shadow-[var(--shadow-card)]">
      <div className="absolute -right-24 -top-28 h-64 w-64 rounded-full opacity-10 blur-3xl" style={{ background: 'var(--accent-primary)' }} />
      <div className="relative">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-primary)] flex items-center gap-2"><Sparkles size={14} /> Workspace</p><h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight text-[var(--text-primary)]">What are we working on?</h1><p className="mt-2 text-[var(--text-secondary)] max-w-2xl leading-relaxed">Give Uden an outcome. It turns the request into durable execution, routes the work, verifies results, and keeps the trail visible.</p></div>
          <Link href="/tasks" className="btn btn-secondary hidden sm:inline-flex items-center gap-2"><Activity size={15} /> View work history</Link>
        </div>
        <div className="mt-7 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 p-3 focus-within:border-[var(--accent-primary)] transition-colors">
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') void createTask(); }} placeholder="Describe the outcome you need…" rows={4} className="w-full resize-none bg-transparent px-2 py-1 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2"><ShieldCheck size={15} className="text-[var(--text-muted)]" /><select value={mode} onChange={(event) => setMode(event.target.value as TaskMode)} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] outline-none"><option value="permission-based">Ask before high-risk actions</option><option value="permissionless">Permissionless</option></select><span className="hidden md:inline text-[10px] text-[var(--text-muted)]">⌘ Enter to start</span></div>
            <button type="button" onClick={() => void createTask()} disabled={!prompt.trim() || !apiKey || creating} className="btn btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">{creating ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}{creating ? 'Starting…' : 'Start work'}</button>
          </div>
        </div>
        {!apiKey && <p className="mt-3 text-xs text-[var(--text-muted)]">Sign in to start work in this workspace.</p>}
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      </div>
    </section>

    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[
        { label: 'Tasks', value: usage ? formatNumber(usage.totalTasks) : '—', icon: Activity },
        { label: 'Completed', value: usage ? formatNumber(usage.completedTasks) : '—', icon: CheckCircle2 },
        { label: 'Execution cost', value: usage ? formatCurrency(usage.totalCostCents) : '—', icon: DollarSign },
        { label: 'Avg quality', value: usage ? `${usage.averageQualityScore.toFixed(1)}/100` : '—', icon: ShieldCheck },
      ].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><div className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><Icon size={14} />{label}</div>{loading ? <CardSkeleton /> : <div className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{value}</div>}</div>)}
    </section>

    <section>
      <div className="flex items-center justify-between mb-3"><div><h2 className="text-base font-semibold text-[var(--text-primary)]">Start from an outcome</h2><p className="text-xs text-[var(--text-muted)] mt-1">Each option starts real work when selected.</p></div><Plus size={16} className="text-[var(--text-muted)]" /></div>
      <div className="grid md:grid-cols-3 gap-3">{starters.map((starter) => <button key={starter} type="button" onClick={() => setPrompt(starter)} className="group text-left rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 hover:border-[var(--accent-primary)] hover:-translate-y-0.5 transition-all"><Bot size={17} className="text-[var(--accent-primary)]" /><p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">{starter}</p></button>)}</div>
    </section>

    <section className="grid lg:grid-cols-[1.45fr_1fr] gap-5">
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 mb-5"><div><h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2"><Workflow size={17} /> Latest execution</h2><p className="text-xs text-[var(--text-muted)] mt-1">The most recent durable graph recorded by Uden.</p></div><Link href="/graphs" className="text-xs text-[var(--accent-primary)] flex items-center gap-1">Open graph <ArrowRight size={13} /></Link></div>
        {loading ? <div className="space-y-3"><CardSkeleton /><CardSkeleton /></div> : latestGraph ? <div className="space-y-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium text-[var(--text-primary)] truncate">{latestGraph.goal || latestGraph.id}</p><p className="font-mono text-[10px] text-[var(--text-muted)] mt-1 truncate">{latestGraph.id}</p></div><StatusBadge status={graphStatusToTaskStatus(latestGraph.status)} /></div><div className="grid grid-cols-3 gap-2"><Metric label="Nodes" value={String(graphStats.nodes)} /><Metric label="Completed" value={String(graphStats.completed)} /><Metric label="Running" value={String(graphStats.running)} /></div><div className="space-y-2">{(latestGraph.nodes || []).slice(0, 5).map((node, index) => <div key={node.id} className="flex items-center gap-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2.5"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] text-[var(--text-muted)]">{index + 1}</span><span className="min-w-0 flex-1 truncate text-xs text-[var(--text-secondary)]">{node.title}</span><StatusBadge status={graphStatusToTaskStatus(node.status)} /></div>)}</div></div> : <div className="py-10 text-center text-sm text-[var(--text-secondary)]"><Workflow className="mx-auto mb-3 opacity-50" /><p>No execution graph has been recorded yet.</p><Link href="/tasks/new" className="btn btn-primary inline-flex mt-4">Start your first work</Link></div>}
      </div>

      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 md:p-6"><div className="flex items-start justify-between mb-5"><div><h2 className="text-base font-semibold text-[var(--text-primary)]">Usage</h2><p className="text-xs text-[var(--text-muted)] mt-1">Recorded workspace consumption.</p></div><Link href="/analytics" className="text-xs text-[var(--accent-primary)]">Details</Link></div>{loading ? <CardSkeleton /> : usage ? <div className="space-y-5"><div><div className="flex justify-between text-xs mb-2"><span className="text-[var(--text-secondary)]">Monthly budget</span><span className="text-[var(--text-primary)]">{usage.budgetUsedPercent.toFixed(1)}%</span></div><div className="h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden"><div className="h-full bg-[var(--accent-primary)] rounded-full" style={{ width: `${Math.min(100, Math.max(0, usage.budgetUsedPercent))}%` }} /></div></div><div className="grid grid-cols-2 gap-3"><Metric label="Input tokens" value={formatNumber(usage.totalTokensIn)} /><Metric label="Output tokens" value={formatNumber(usage.totalTokensOut)} /><Metric label="Escalations" value={formatNumber(usage.escalationCount)} /><Metric label="Routing savings" value={formatCurrency(usage.savingsEstimateCents)} /></div></div> : <p className="text-sm text-[var(--text-secondary)]">No usage data recorded yet.</p>}</div>
    </section>

    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 md:p-6"><div className="flex items-center justify-between mb-4"><div><h2 className="text-base font-semibold text-[var(--text-primary)]">Recent work</h2><p className="text-xs text-[var(--text-muted)] mt-1">Live tasks from this workspace.</p></div><Link href="/tasks" className="text-xs text-[var(--accent-primary)] flex items-center gap-1">View all <ArrowRight size={13} /></Link></div>{loading ? <TableSkeleton rows={4} /> : recentTasks.length === 0 ? <div className="py-10 text-center text-[var(--text-secondary)]"><CircleDot className="mx-auto mb-3 opacity-50" /><p>No work has been started yet.</p></div> : <div className="space-y-2">{recentTasks.map((task) => <Link key={task.id} href={`/tasks/${task.id}`} className="group flex flex-col sm:flex-row sm:items-center gap-3 justify-between rounded-xl border border-[var(--border-color)] p-4 hover:border-[var(--accent-primary)] transition-colors"><div className="min-w-0"><p className="font-medium text-sm text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)]">{task.prompt}</p><p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">{task.id}</p></div><div className="flex items-center gap-3 shrink-0"><StatusBadge status={task.status} />{task.modelUsed && <span className="hidden md:inline text-[10px] text-[var(--text-muted)]">{task.modelUsed}</span>}{task.status === 'completed' && <span className="text-[10px] text-[var(--accent-primary)]">Verified</span>}<ArrowRight size={14} className="text-[var(--text-muted)]" /></div></Link>)}</div>}</section>

    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] text-[var(--text-muted)]"><span className="flex items-center gap-1.5"><Clock3 size={12} /> Durable execution state</span><span className="flex items-center gap-1.5"><Zap size={12} /> Cost-aware routing</span><span className="flex items-center gap-1.5"><ShieldCheck size={12} /> Policy-aware actions</span></div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3"><div className="text-[10px] text-[var(--text-muted)]">{label}</div><div className="text-sm font-semibold mt-1 text-[var(--text-primary)]">{value}</div></div>; }
