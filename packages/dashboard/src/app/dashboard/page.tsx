'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowRight, CheckCircle2, CircleAlert, Clock3, Loader2, Plus, ShieldCheck, Sparkles } from 'lucide-react';
import { api, Task, TaskMode, TaskStatus } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';
import { CardSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton';

const starters = [
  'Research a topic and produce a decision brief with sources.',
  'Analyze this project and identify the highest-risk issues.',
  'Turn these requirements into an implementation plan.',
];

const activeStatuses: TaskStatus[] = ['pending', 'classifying', 'routing', 'processing', 'quality-check', 'escalating', 'awaiting-approval', 'approved'];
const attentionStatuses: TaskStatus[] = ['awaiting-approval', 'failed', 'rejected'];

export default function DashboardOverview() {
  const { data: session } = useSession();
  const apiKey = (session as any)?.apiKey as string | undefined;
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<TaskMode>('permission-based');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadWorkspace() {
    if (!apiKey) { setLoading(false); return; }
    try {
      const result = await api.getTasks(apiKey);
      setTasks(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your workspace.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadWorkspace(); }, [apiKey]);

  async function createTask() {
    const value = prompt.trim();
    if (!value || !apiKey || creating) return;
    setCreating(true); setError(null);
    try {
      const task = await api.createTask(value, mode, undefined, apiKey);
      setPrompt('');
      setTasks((current) => [task, ...current.filter((item) => item.id !== task.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start the work.');
    } finally { setCreating(false); }
  }

  const activeWork = useMemo(() => tasks.filter((task) => activeStatuses.includes(task.status)).slice(0, 6), [tasks]);
  const attention = useMemo(() => tasks.filter((task) => attentionStatuses.includes(task.status)).slice(0, 6), [tasks]);
  const recent = useMemo(() => tasks.filter((task) => !activeStatuses.includes(task.status)).slice(0, 6), [tasks]);

  return (
    <div className="space-y-7 pb-10">
      <section className="page-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1 className="page-title">What is Uden working on?</h1>
          <p className="page-description">Start an outcome, then let Uden keep execution, decisions, and evidence in view.</p>
        </div>
        <Link href="/tasks" className="btn btn-secondary hidden sm:inline-flex"><span>History</span><ArrowRight size={14} /></Link>
      </section>

      <section className="card overflow-hidden">
        <div className="card-header">
          <div>
            <p className="metric-label">New objective</p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-.02em] text-[var(--text-primary)]">Give Uden something to handle</h2>
          </div>
          <div className="hidden items-center gap-2 text-xs text-[var(--text-muted)] sm:flex"><ShieldCheck size={14} /> Durable execution</div>
        </div>
        <div className="card-body">
          <label htmlFor="work-prompt" className="sr-only">Describe the outcome you need</label>
          <textarea id="work-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') void createTask(); }} placeholder="Describe the outcome you need…" rows={3} className="w-full resize-none bg-transparent text-[1.05rem] leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none" />
          <div className="mt-5 flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><ShieldCheck size={15} /><select aria-label="Execution permission mode" value={mode} onChange={(event) => setMode(event.target.value as TaskMode)} className="rounded-md border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2.5 py-2 text-xs text-[var(--text-secondary)] outline-none"><option value="permission-based">Ask before high-risk actions</option><option value="permissionless">Permissionless</option></select><span className="hidden md:inline">⌘ Enter</span></div>
            <button type="button" onClick={() => void createTask()} disabled={!prompt.trim() || !apiKey || creating} className="btn btn-primary min-h-11 px-5">{creating ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}{creating ? 'Starting…' : 'Start work'}</button>
          </div>
          {!apiKey && <p className="mt-3 text-xs text-[var(--text-muted)]">Sign in to start work in this workspace.</p>}
          {error && <p role="alert" className="mt-3 text-sm text-[var(--status-danger)]">{error}</p>}
        </div>
      </section>

      <section className="workspace-grid">
        <div className="workspace-stack">
          <TaskSection title="Active work" description="What Uden is executing now." icon={<Clock3 size={16} />} tasks={activeWork} loading={loading} empty="Nothing is running right now." />
          <section className="card">
            <div className="card-header">
              <div><p className="metric-label">Recent</p><h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">Recent work</h2></div>
              <Link href="/tasks" className="text-xs font-semibold text-[var(--accent-primary)]">View all <ArrowRight size={13} className="inline" /></Link>
            </div>
            <div className="card-body">
              {loading ? <TableSkeleton rows={4} /> : recent.length === 0 ? <EmptyState icon={<CheckCircle2 size={20} />} text="No completed work yet." /> : <div>{recent.map((task) => <TaskRow key={task.id} task={task} />)}</div>}
            </div>
          </section>
        </div>
        <div className="workspace-stack">
          <TaskSection title="Needs attention" description="Decisions or intervention required." icon={<CircleAlert size={16} />} tasks={attention} loading={loading} empty="Nothing needs your attention." attention />
          <section className="card">
            <div className="card-header"><div><p className="metric-label">Shortcuts</p><h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">Start from an outcome</h2></div><Plus size={15} className="text-[var(--text-muted)]" /></div>
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {starters.map((starter) => <button key={starter} type="button" onClick={() => setPrompt(starter)} className="group flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-[var(--bg-hover)]"><Sparkles size={14} className="mt-0.5 shrink-0 text-[var(--accent-primary)]" /><span className="text-sm leading-relaxed text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">{starter}</span></button>)}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function TaskSection({ title, description, icon, tasks, loading, empty, attention = false }: { title: string; description: string; icon: React.ReactNode; tasks: Task[]; loading: boolean; empty: string; attention?: boolean }) {
  return <section className="surface p-5 md:p-6"><div className="section-header"><div><h2 className="section-title flex items-center gap-2">{icon}{title}</h2><p className="section-description">{description}</p></div>{tasks.length > 0 && <span className="rounded-full border border-[var(--border-color)] px-2 py-1 text-[10px] text-[var(--text-muted)]">{tasks.length}</span>}</div>{loading ? <div className="space-y-2"><CardSkeleton /><CardSkeleton /></div> : tasks.length === 0 ? <EmptyState icon={attention ? <CircleAlert size={20} /> : <Clock3 size={20} />} text={empty} /> : <div className="space-y-2">{tasks.map((task) => <TaskRow key={task.id} task={task} />)}</div>}</section>;
}

function TaskRow({ task }: { task: Task }) {
  return <Link href={`/tasks/${task.id}`} className="surface-interactive flex items-center gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-3.5 py-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-[var(--text-primary)]">{task.prompt}</p><p className="mt-1 truncate font-mono text-[10px] text-[var(--text-muted)]">{task.id}</p></div><StatusBadge status={task.status} /><ArrowRight size={14} className="shrink-0 text-[var(--text-muted)]" /></Link>;
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex min-h-28 flex-col items-center justify-center text-center text-sm text-[var(--text-muted)]"><div className="mb-2 opacity-60">{icon}</div><p>{text}</p></div>; }
