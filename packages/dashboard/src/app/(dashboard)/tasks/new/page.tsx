'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { api, TaskMode } from '@/lib/api';

export default function NewTaskPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const apiKey = (session as any)?.apiKey as string | undefined;
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<TaskMode>('permission-based');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = prompt.trim();
    if (!value || !apiKey || creating) return;
    setCreating(true);
    setError(null);
    try {
      const task = await api.createTask(value, mode, undefined, apiKey);
      router.push(`/tasks/${task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start this work.');
      setCreating(false);
    }
  }

  return <div className="max-w-5xl space-y-7 pb-10">
    <header><p className="text-sm text-[var(--accent-primary)] flex items-center gap-2"><Sparkles size={15}/> Workbench</p><h1 className="text-3xl font-semibold text-[var(--text-primary)] mt-2">Start new work</h1><p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">Describe the outcome you need. Uden will create the durable task, plan the execution graph when appropriate, route the work, and record the result.</p></header>
    <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
      <form onSubmit={handleSubmit} className="glass-card p-5 md:p-6 border border-[var(--border-color)] shadow-[var(--shadow-glow)] space-y-5">
        <div className="space-y-2"><label htmlFor="task-prompt" className="text-sm font-medium text-[var(--text-primary)]">What should Uden do?</label><textarea id="task-prompt" value={prompt} onChange={(event)=>setPrompt(event.target.value)} onKeyDown={(event)=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter') void handleSubmit(event);}} autoFocus rows={11} className="w-full resize-y min-h-64 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] transition-colors" placeholder="Example: Analyze this project, identify the highest-risk issues, and propose fixes I can review before anything changes." /></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1"><div className="flex items-center gap-2"><ShieldCheck size={16} className="text-[var(--text-muted)]"/><select aria-label="Execution mode" value={mode} onChange={(event)=>setMode(event.target.value as TaskMode)} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-secondary)] outline-none"><option value="permission-based">Ask before high-risk actions</option><option value="permissionless">Permissionless</option></select></div><button type="submit" disabled={!prompt.trim()||!apiKey||creating} className="btn btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">{creating?'Starting…':<>Start work <ArrowRight size={17}/></>}</button></div>
        {!apiKey&&<p className="text-sm text-[var(--text-secondary)]">Sign in to start work. Your task will be created through the authenticated workspace API.</p>}
        {error&&<div role="alert" className="rounded-lg border border-red-400/30 bg-red-400/5 p-3 text-sm text-red-200">{error}</div>}
      </form>
      <aside className="space-y-4"><div className="glass-card p-5 border border-[var(--border-color)]"><h2 className="font-semibold text-[var(--text-primary)]">Execution boundary</h2><p className="text-sm text-[var(--text-secondary)] mt-2 leading-6">Permission-based mode pauses high-risk work for explicit approval. Permissionless mode allows the execution policy to proceed without that approval gate.</p></div><div className="glass-card p-5 border border-[var(--border-color)]"><h2 className="font-semibold text-[var(--text-primary)]">What happens next</h2><ol className="mt-3 space-y-3 text-sm text-[var(--text-secondary)]"><li><span className="text-[var(--text-primary)] font-medium">1. Plan</span> — Uden classifies and decomposes the request when needed.</li><li><span className="text-[var(--text-primary)] font-medium">2. Route</span> — each graph unit can use the model tier suited to the work.</li><li><span className="text-[var(--text-primary)] font-medium">3. Execute</span> — real provider calls and project/runtime actions follow execution policy.</li><li><span className="text-[var(--text-primary)] font-medium">4. Verify</span> — the durable task and execution trail remain available for review.</li></ol></div></aside>
    </div>
  </div>;
}
