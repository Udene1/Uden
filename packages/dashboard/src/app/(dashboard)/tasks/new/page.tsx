'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { api, TaskMode } from '@/lib/api';

const examples = [
  'Analyze this project, identify the highest-risk issues, and propose fixes I can review before anything changes.',
  'Review the current architecture and produce a prioritized plan for the next production-hardening pass.',
  'Investigate this failure, trace the likely cause, and give me a verified remediation path.'
];

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
    setCreating(true); setError(null);
    try { const task = await api.createTask(value, mode, undefined, apiKey); router.push(`/tasks/${task.id}`); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to start this work.'); setCreating(false); }
  }

  return <div className="max-w-5xl space-y-6 md:space-y-7 pb-28 md:pb-10">
    <header><p className="text-sm text-[var(--accent-primary)] flex items-center gap-2"><Sparkles size={15}/> Workbench</p><h1 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)] mt-2">Start with the outcome</h1><p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl leading-6">Tell Uden what needs to be true when the work is finished. The execution system decides how to decompose, route, run, and verify it.</p></header>
    <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5 md:gap-6">
      <form onSubmit={handleSubmit} className="glass-card p-4 md:p-6 border border-[var(--border-color)] shadow-[var(--shadow-glow)] space-y-5">
        <div className="space-y-2"><div className="flex items-center justify-between gap-3"><label htmlFor="task-prompt" className="text-sm font-medium text-[var(--text-primary)]">What should Uden accomplish?</label><span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Required</span></div><textarea id="task-prompt" value={prompt} onChange={(event)=>setPrompt(event.target.value)} onKeyDown={(event)=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();event.currentTarget.form?.requestSubmit();}}} autoFocus rows={10} className="w-full resize-y min-h-56 md:min-h-64 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] transition-colors leading-6" placeholder="Describe the result you want, the context Uden should use, and any constraints that matter." />
          <div className="flex flex-wrap gap-2 pt-1">{examples.map(example=><button key={example} type="button" onClick={()=>setPrompt(example)} className="text-left rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition-colors">Use example</button>)}</div>
        </div>
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3.5"><div className="flex items-start gap-3"><ShieldCheck size={17} className="mt-0.5 text-[var(--accent-primary)] shrink-0"/><div><p className="text-sm font-medium text-[var(--text-primary)]">Execution mode</p><p className="text-xs text-[var(--text-secondary)] mt-1">Choose where Uden must stop for human approval.</p><select aria-label="Execution mode" value={mode} onChange={(event)=>setMode(event.target.value as TaskMode)} className="mt-2 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent-primary)]"><option value="permission-based">Ask before high-risk actions</option><option value="permissionless">Permissionless</option></select></div></div></div>
        {!apiKey&&<p className="text-sm text-[var(--text-secondary)]">Sign in to start work. The task is created through the authenticated workspace API.</p>}
        {error&&<div role="alert" className="rounded-lg border border-red-400/30 bg-red-400/5 p-3 text-sm text-red-200">{error}</div>}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><p className="text-[11px] text-[var(--text-muted)]">⌘/Ctrl + Enter starts work</p><button type="submit" disabled={!prompt.trim()||!apiKey||creating} className="btn btn-primary min-h-12 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">{creating?'Creating durable task…':<>Start work <ArrowRight size={17}/></>}</button></div>
      </form>
      <aside className="space-y-4">
        <div className="glass-card p-4 md:p-5 border border-[var(--border-color)]"><h2 className="font-semibold text-[var(--text-primary)]">What Uden records</h2><ul className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]"><li className="flex gap-2"><CheckCircle2 size={16} className="text-[var(--accent-primary)] shrink-0"/>The requested outcome</li><li className="flex gap-2"><CheckCircle2 size={16} className="text-[var(--accent-primary)] shrink-0"/>Execution state and decisions</li><li className="flex gap-2"><CheckCircle2 size={16} className="text-[var(--accent-primary)] shrink-0"/>Recorded attempts, cost, and verification</li></ul></div>
        <div className="glass-card p-4 md:p-5 border border-[var(--border-color)]"><h2 className="font-semibold text-[var(--text-primary)]">Execution boundary</h2><p className="text-sm text-[var(--text-secondary)] mt-2 leading-6">Permission-based mode pauses high-risk work for explicit approval. Permissionless mode allows policy-compliant execution without that approval gate.</p></div>
        <div className="glass-card p-4 md:p-5 border border-[var(--border-color)]"><h2 className="font-semibold text-[var(--text-primary)]">After you start</h2><ol className="mt-3 space-y-3 text-sm text-[var(--text-secondary)]"><li><span className="font-medium text-[var(--text-primary)]">1. Plan</span> — classify and decompose when needed.</li><li><span className="font-medium text-[var(--text-primary)]">2. Route</span> — choose the model tier suited to each unit.</li><li><span className="font-medium text-[var(--text-primary)]">3. Execute</span> — real provider/runtime actions follow policy.</li><li><span className="font-medium text-[var(--text-primary)]">4. Verify</span> — preserve the durable trail for review.</li></ol></div>
      </aside>
    </div>
  </div>;
}
