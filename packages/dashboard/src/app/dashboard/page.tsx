'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { api, Task } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';

const starters = [
  'Research a topic and produce a decision brief with sources.',
  'Analyze this project and identify the highest-risk issues.',
  'Turn these requirements into an implementation plan.',
];

export default function DashboardOverview() {
  const [prompt, setPrompt] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void api.getTasks().then((r) => setTasks(r.data.slice(0, 4))).catch(() => undefined); }, []);

  async function createTask() {
    const value = prompt.trim();
    if (!value || creating) return;
    setCreating(true);
    setError(null);
    try {
      const task = await api.createTask(value);
      setTasks((current) => [task, ...current.filter((item) => item.id !== task.id)].slice(0, 4));
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start the work.');
    } finally { setCreating(false); }
  }

  return (
    <div className="min-h-[calc(100vh-9rem)] pb-16">
      <section className="mx-auto flex min-h-[62vh] max-w-3xl flex-col justify-center">
        <div className="mb-5 text-center">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[.18em] text-[var(--accent-primary)]"><Sparkles size={13} /> Uden</p>
          <h1 className="text-3xl font-semibold tracking-[-.035em] text-[var(--text-primary)] md:text-5xl">What do you want to get done?</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)] md:text-base">Describe the outcome. Uden will keep the work, execution, and evidence recorded.</p>
        </div>

        <div className="rounded-2xl border bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-glow)]" style={{ borderColor: 'var(--border-color)' }}>
          <textarea autoFocus id="work-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') void createTask(); }} placeholder="Tell Uden what you need…" rows={5} className="w-full resize-none bg-transparent px-2 py-2 text-base leading-7 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none md:text-lg" />
          <div className="flex items-center justify-between gap-3 border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <span className="text-xs text-[var(--text-muted)]">⌘ Enter to start</span>
            <button type="button" onClick={() => void createTask()} disabled={!prompt.trim() || creating} className="btn btn-primary min-h-10 px-4">{creating ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}{creating ? 'Starting…' : 'Start work'}</button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {starters.map((starter) => <button key={starter} type="button" onClick={() => setPrompt(starter)} className="rounded-full border px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]" style={{ borderColor: 'var(--border-color)' }}>{starter}</button>)}
        </div>

        {error && <p role="alert" className="mx-auto mt-4 text-sm text-[var(--status-danger)]">{error}</p>}
      </section>

      {tasks.length > 0 && <section className="mx-auto max-w-3xl border-t pt-5" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[.14em] text-[var(--text-muted)]">Recent work</p><Link href="/tasks" className="text-xs font-medium text-[var(--accent-primary)]">View all <ArrowRight size={12} className="inline" /></Link></div>
        <div className="space-y-1">{tasks.map((task) => <Link key={task.id} href={'/tasks/' + task.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-[var(--bg-hover)]"><span className="min-w-0 flex-1 truncate text-sm text-[var(--text-primary)]">{task.prompt}</span><StatusBadge status={task.status} /></Link>)}</div>
      </section>}
    </div>
  );
}
