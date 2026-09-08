'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowRight, Bot, CheckCircle2, CircleDot, Loader2, Plus, ShieldCheck, Sparkles } from 'lucide-react';
import { api, Task, TaskMode } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';
import { CardSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton';

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
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadTasks() {
    if (!apiKey) {
      setLoading(false);
      return;
    }
    try {
      const result = await api.getTasks(apiKey);
      setRecentTasks(result.data.slice(0, 6));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your work.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks();
  }, [apiKey]);

  async function createTask() {
    const value = prompt.trim();
    if (!value || !apiKey || creating) return;
    setCreating(true);
    setError(null);
    try {
      const task = await api.createTask(value, mode, undefined, apiKey);
      setPrompt('');
      setRecentTasks((current) => [task, ...current.filter((item) => item.id !== task.id)].slice(0, 6));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start the work.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8 pb-10">
      <section className="pt-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--accent-primary)] flex items-center gap-2"><Sparkles size={15} /> Uden workspace</p>
            <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight text-[var(--text-primary)]">What are we working on?</h1>
            <p className="mt-2 text-[var(--text-secondary)] max-w-2xl">Give Uden the outcome you want. It will plan the work, route each step, execute it, verify the result, and keep the work trail.</p>
          </div>
          <Link href="/tasks" className="hidden sm:flex btn btn-secondary items-center gap-2"><Plus size={16} /> All tasks</Link>
        </div>
      </section>

      <section className="glass-card p-5 md:p-6 border border-[var(--border-color)] shadow-[var(--shadow-glow)]">
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-3"><Bot size={17} /> New work</div>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') void createTask(); }}
          placeholder="Describe the work or outcome you need…"
          rows={5}
          className="w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] transition-colors"
        />
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-[var(--text-muted)]" />
            <select value={mode} onChange={(event) => setMode(event.target.value as TaskMode)} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-secondary)] outline-none">
              <option value="permission-based">Ask before high-risk actions</option>
              <option value="permissionless">Permissionless</option>
            </select>
          </div>
          <button type="button" onClick={() => void createTask()} disabled={!prompt.trim() || !apiKey || creating} className="btn btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {creating ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} />}
            {creating ? 'Starting…' : 'Start work'}
          </button>
        </div>
        {!apiKey && <p className="mt-3 text-xs text-[var(--text-muted)]">Sign in to start work in this workspace.</p>}
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div><h2 className="text-lg font-semibold text-[var(--text-primary)]">Start with an outcome</h2><p className="text-sm text-[var(--text-secondary)] mt-1">These are starting points, not simulated work.</p></div>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {examples.map((example) => (
            <button key={example} type="button" onClick={() => setPrompt(example)} className="text-left glass-card p-4 hover:border-[var(--accent-primary)] transition-colors text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">{example}</button>
          ))}
        </div>
      </section>

      <section className="glass-card p-5 md:p-6">
        <div className="flex items-center justify-between mb-5"><div><h2 className="text-lg font-semibold text-[var(--text-primary)]">Recent work</h2><p className="text-sm text-[var(--text-secondary)] mt-1">Live tasks from your workspace.</p></div><Link href="/tasks" className="text-sm text-[var(--accent-primary)] flex items-center gap-1">View all <ArrowRight size={14} /></Link></div>
        {loading ? <TableSkeleton rows={4} /> : recentTasks.length === 0 ? (
          <div className="py-12 text-center text-[var(--text-secondary)]"><CircleDot className="mx-auto mb-3 opacity-50" /><p>No work has been started yet.</p></div>
        ) : (
          <div className="space-y-2">
            {recentTasks.map((task) => (
              <Link key={task.id} href={`/tasks/${task.id}`} className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between rounded-xl border border-[var(--border-color)] p-4 hover:bg-[var(--bg-hover)] transition-colors">
                <div className="min-w-0"><p className="font-medium text-[var(--text-primary)] truncate">{task.prompt}</p><p className="text-xs text-[var(--text-muted)] mt-1 font-mono">{task.id}</p></div>
                <div className="flex items-center gap-4 shrink-0"><StatusBadge status={task.status} />{task.status === 'completed' && <CheckCircle2 size={16} className="text-[var(--accent-primary)]" />}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
