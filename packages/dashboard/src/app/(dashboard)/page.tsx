'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Activity, ArrowRight, Bot, CircleDot, DollarSign, Loader2, Plus, ShieldCheck, Sparkles, Workflow, Zap } from 'lucide-react';
import { api, Task, TaskMode, TaskStatus, UsageSummary } from '@/lib/api';
import { getGraph, getGraphs } from '@/lib/graph-api';
import StatusBadge from '@/components/ui/StatusBadge';
import { CardSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { formatCurrency, formatNumber } from '@/lib/utils';

type Graph = { id: string; goal?: string; status?: TaskStatus; nodes?: Array<{ id: string; title: string; status: string; selectedModel?: string }> };

const examples = [
  'Research this topic and produce a concise decision brief with sources.',
  'Analyze the project, identify the highest-risk issues, and propose fixes.',
  'Turn these requirements into an implementation plan and execute the safe parts.',
];

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
      setRecentTasks(tasksResult.data.slice(0, 6));
      setUsage(usageResult);
      const first = graphResult.graphs?.[0];
      if (first?.id) { const detail = await getGraph(first.id); setLatestGraph(detail.graph); } else setLatestGraph(null);
      setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load your workspace.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadWorkspace(); }, [apiKey]);

  async function createTask() {
    const value = prompt.trim();
    if (!value || !apiKey || creating) return;
    setCreating(true); setError(null);
    try { const task = await api.createTask(value, mode, undefined, apiKey); setPrompt(''); setRecentTasks((current) => [task, ...current.filter((item) => item.id !== task.id)].slice(0, 6)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to start the work.'); }
    finally { setCreating(false); }
  }

  const graphStats = useMemo(() => { const nodes = latestGraph?.nodes || []; return { nodes: nodes.length, completed: nodes.filter((node) => node.status === 'completed').length, running: nodes.filter((node) => node.status === 'running').length }; }, [latestGraph]);

  return (
    <div className="space-y-7 pb-10">
      <section className="pt-2"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-[var(--accent-primary)] flex items-center gap-2"><Sparkles size={15} /> Uden workspace</p><h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight text-[var(--text-primary)]">What are we working on?</h1><p className="mt-2 text-[var(--text-secondary)] max-w-2xl">Give Uden the outcome you want. It plans the work, routes each step, executes it, verifies the result, and keeps the durable work trail.</p></div><Link href="/tasks" className="hidden sm:flex btn btn-secondary items-center gap-2"><Plus size={16} /> All tasks</Link></div></section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[
        { label: 'Tasks', value: usage ? formatNumber(usage.totalTasks) : '—', icon: Activity },
        { label: 'Completed', value: usage ? formatNumber(usage.completedTasks) : '—', icon: Zap },
        { label: 'Execution cost', value: usage ? formatCurrency(usage.totalCostCents) : '—', icon: DollarSign },
        { label: 'Avg quality', value: usage ? `${usage.averageQualityScore.toFixed(1)}/100` : '—', icon: ShieldCheck },
      ].map(({ label, value, icon: Icon }) => <div key={label} className="glass-card p-4 border border-[var(--border-color)]"><div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"><Icon size={14} /> {label}</div>{loading ? <CardSkeleton /> : <div className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{value}</div>}</div>)}</section>

      <section className="glass-card p-5 md:p-6 border border-[var(--border-color)] shadow-[var(--shadow-glow)]"><div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-3"><Bot size={17} /> New work</div><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') void createTask(); }} placeholder="Describe the work or outcome you need…" rows={5} className="w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] transition-colors" /><div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex items-center gap-2"><ShieldCheck size={15} className="text-[var(--text-muted)]" /><select value={mode} onChange={(event) => setMode(event.target.value as TaskMode)} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-secondary)] outline-none"><option value="permission-based">Ask before high-risk actions</option><option value="permissionless">Permissionless</option></select></div><button type="button" onClick={() => void createTask()} disabled={!prompt.trim() || !apiKey || creating} className="btn btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">{creating ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} />}{creating ? 'Starting…' : 'Start work'}</button></div>{!apiKey && <p className="mt-3 text-xs text-[var(--text-muted)]">Sign in to start work in this workspace.</p>}{error && <p className="mt-3 text-sm text-red-300">{error}</p>}</section>

      <section><div className="flex items-center justify-between mb-4"><div><h2 className="text-lg font-semibold text-[var(--text-primary)]">Start with an outcome</h2><p className="text-sm text-[var(--text-secondary)] mt-1">These start real work; they are not simulated examples.</p></div></div><div className="grid md:grid-cols-3 gap-3">{examples.map((example) => <button key={example} type="button" onClick={() => setPrompt(example)} className="text-left glass-card p-4 hover:border-[var(--accent-primary)] transition-colors text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">{example}</button>)}</div></section>

      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6"><div className="glass-card p-5 md:p-6 border border-[var(--border-color)]"><div className="flex items-center justify-between mb-5"><div><h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2"><Workflow size={18} /> Latest execution</h2><p className="text-sm text-[var(--text-secondary)] mt-1">The most recent durable graph recorded by Uden.</p></div><Link href="/graphs" className="text-sm text-[var(--accent-primary)] flex items-center gap-1">Open graphs <ArrowRight size={14} /></Link></div>{loading ? <div className="space-y-3"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div> : latestGraph ? <div className="space-y-4"><div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium text-[var(--text-primary)] truncate">{latestGraph.goal || latestGraph.id}</p><p className="font-mono text-xs text-[var(--text-muted)] mt-1">{latestGraph.id}</p></div><StatusBadge status={latestGraph.status || 'pending'} /></div><div className="grid grid-cols-3 gap-2"><Metric label="Nodes" value={String(graphStats.nodes)} /><Metric label="Completed" value={String(graphStats.completed)} /><Metric label="Running" value={String(graphStats.running)} /></div><div className="flex flex-wrap gap-2 pt-1">{(latestGraph.nodes || []).slice(0, 8).map((node) => <span key={node.id} className="px-3 py-1.5 rounded-full border border-[var(--border-color)] text-xs text-[var(--text-secondary)]">{node.title} · {node.status}</span>)}</div></div> : <div className="py-10 text-center text-sm text-[var(--text-secondary)]"><Workflow className="mx-auto mb-3 opacity-50" /><p>No execution graph has been recorded yet.</p></div>}</div>

        <div className="glass-card p-5 md:p-6 border border-[var(--border-color)]"><div className="flex items-center justify-between mb-5"><div><h2 className="text-lg font-semibold text-[var(--text-primary)]">Usage</h2><p className="text-sm text-[var(--text-secondary)] mt-1">Recorded workspace consumption.</p></div><Link href="/analytics" className="text-sm text-[var(--accent-primary)]">Details</Link></div>{loading ? <CardSkeleton /> : usage ? <div className="space-y-5"><div><div className="flex justify-between text-sm mb-2"><span className="text-[var(--text-secondary)]">Monthly budget</span><span className="text-[var(--text-primary)]">{usage.budgetUsedPercent.toFixed(1)}%</span></div><div className="h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden"><div className="h-full bg-[var(--accent-primary)] rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, usage.budgetUsedPercent))}%` }} /></div></div><div className="grid grid-cols-2 gap-4"><Metric label="Input tokens" value={formatNumber(usage.totalTokensIn)} /><Metric label="Output tokens" value={formatNumber(usage.totalTokensOut)} /><Metric label="Escalations" value={formatNumber(usage.escalationCount)} /><Metric label="Routing savings" value={formatCurrency(usage.savingsEstimateCents)} /></div></div> : <p className="text-sm text-[var(--text-secondary)]">No usage data recorded yet.</p>}</div></section>

      <section className="glass-card p-5 md:p-6"><div className="flex items-center justify-between mb-5"><div><h2 className="text-lg font-semibold text-[var(--text-primary)]">Recent work</h2><p className="text-sm text-[var(--text-secondary)] mt-1">Live tasks from your workspace.</p></div><Link href="/tasks" className="text-sm text-[var(--accent-primary)] flex items-center gap-1">View all <ArrowRight size={14} /></Link></div>{loading ? <TableSkeleton rows={4} /> : recentTasks.length === 0 ? <div className="py-12 text-center text-[var(--text-secondary)]"><CircleDot className="mx-auto mb-3 opacity-50" /><p>No work has been started yet.</p></div> : <div className="space-y-2">{recentTasks.map((task) => <Link key={task.id} href={`/tasks/${task.id}`} className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between rounded-xl border border-[var(--border-color)] p-4 hover:bg-[var(--bg-hover)] transition-colors"><div className="min-w-0"><p className="font-medium text-[var(--text-primary)] truncate">{task.prompt}</p><p className="text-xs text-[var(--text-muted)] mt-1 font-mono">{task.id}</p></div><div className="flex items-center gap-4 shrink-0"><StatusBadge status={task.status} />{task.modelUsed && <span className="text-xs text-[var(--text-muted)]">{task.modelUsed}</span>}{task.status === 'completed' && <span className="text-xs text-[var(--accent-primary)]">Verified</span>}</div></Link>)}</div>}</section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3"><div className="text-xs text-[var(--text-muted)]">{label}</div><div className="text-sm font-semibold mt-1 text-[var(--text-primary)]">{value}</div></div>; }
