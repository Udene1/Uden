import Link from 'next/link';
import { Sparkles, ArrowRight, ShieldCheck, Zap, TrendingDown, Users } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Background decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-10 animate-pulse" style={{ background: 'var(--accent-gradient)', filter: 'blur(120px)' }}></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-10 animate-pulse" style={{ background: 'var(--accent-secondary)', filter: 'blur(120px)', animationDelay: '2s' }}></div>

      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: 'var(--accent-gradient)' }}>
            <Sparkles size={18} />
          </div>
          <span className="font-bold text-xl tracking-tight text-[var(--text-primary)]">Work Partner</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="btn btn-ghost">Sign In</Link>
          <Link href="/register" className="btn btn-primary rounded-full px-6">Get Started</Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-32 pb-24 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-sm text-[var(--text-secondary)] mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            AI Routing Engine v1.0 is live
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[var(--text-primary)]">
            Intelligent routing for <br />
            <span className="gradient-text">AI agent workflows</span>
          </h1>
          
          <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
            Optimize costs, guarantee quality, and enforce policies across all your LLM calls. The missing middleware for production AI.
          </p>
          
          <div className="flex items-center justify-center gap-4 pt-8">
            <Link href="/register" className="btn btn-primary text-lg px-8 py-4 rounded-xl flex items-center gap-2 shadow-[var(--shadow-glow)]">
              Start Free Trial <ArrowRight size={20} />
            </Link>
            <Link href="https://github.com/ai-work-partner" className="btn btn-secondary text-lg px-8 py-4 rounded-xl">
              View Documentation
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-32">
          {[
            { icon: Zap, title: "Smart Routing", desc: "Automatically select the most cost-effective model based on task complexity." },
            { icon: ShieldCheck, title: "Quality Gates", desc: "Require human approval for high-risk or low-confidence LLM outputs." },
            { icon: TrendingDown, title: "Cost Optimization", desc: "Set strict budgets and track spend across providers in real-time." },
            { icon: Users, title: "Multi-Tenant", desc: "Built for platforms. Isolate data, budgets, and policies per customer." }
          ].map((feature, i) => (
            <div key={i} className="glass-card p-6 flex flex-col gap-4 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-primary)]">
                <feature.icon size={24} />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{feature.title}</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
