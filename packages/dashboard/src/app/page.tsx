import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Workflow, Zap } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-10" style={{ background: 'var(--accent-gradient)', filter: 'blur(120px)' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-10" style={{ background: 'var(--accent-secondary)', filter: 'blur(120px)' }} />
      <header className="container mx-auto px-6 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: 'var(--accent-gradient)' }}><Sparkles size={18} /></div><span className="font-bold text-xl tracking-tight text-[var(--text-primary)]">Uden</span></div>
        <div className="flex items-center gap-3"><Link href="/login" className="btn btn-ghost">Sign In</Link><Link href="/register" className="btn btn-primary rounded-full px-6">Start working</Link></div>
      </header>
      <main className="container mx-auto px-6 pt-24 md:pt-32 pb-24 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-7">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-sm text-[var(--text-secondary)]"><span className="w-2 h-2 rounded-full bg-green-500" /> Your work, planned and executed.</div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[var(--text-primary)]">Give Uden the outcome.<br /><span className="gradient-text">It handles the work.</span></h1>
          <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">Uden turns complex work into an execution graph, routes each step to the right model, verifies the result, and keeps the whole process visible.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6"><Link href="/register" className="btn btn-primary text-lg px-8 py-4 rounded-xl flex items-center gap-2 shadow-[var(--shadow-glow)]">Start working <ArrowRight size={20} /></Link><Link href="/login" className="btn btn-secondary text-lg px-8 py-4 rounded-xl">Sign in</Link></div>
        </div>
        <div className="max-w-5xl mx-auto mt-24 glass-card border border-[var(--border-color)] p-5 md:p-7">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"><div><p className="text-xs uppercase tracking-wider text-[var(--accent-primary)]">The work loop</p><h2 className="text-xl font-semibold text-[var(--text-primary)] mt-1">Plan → execute → verify</h2></div><span className="text-xs text-[var(--text-muted)]">One durable work trail</span></div>
          <div className="grid md:grid-cols-3 gap-3">{[
            { icon: Workflow, title: 'Plan the work', text: 'Break an outcome into dependency-aware steps before execution.' },
            { icon: Zap, title: 'Execute intelligently', text: 'Route each step to a capable model while respecting cost and policy.' },
            { icon: CheckCircle2, title: 'Verify the result', text: 'Keep attempts, quality checks, failures, approvals, and recovery visible.' },
          ].map(({ icon: Icon, title, text }) => <div key={title} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5"><Icon size={22} className="text-[var(--accent-primary)]" /><h3 className="font-semibold text-[var(--text-primary)] mt-4">{title}</h3><p className="text-sm leading-relaxed text-[var(--text-secondary)] mt-2">{text}</p></div>)}</div>
        </div>
        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto mt-5">{['Real execution state','Human approval when needed','Cost-aware model routing'].map((item) => <div key={item} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><ShieldCheck size={16} className="text-[var(--accent-primary)]" />{item}</div>)}</div>
      </main>
    </div>
  );
}
