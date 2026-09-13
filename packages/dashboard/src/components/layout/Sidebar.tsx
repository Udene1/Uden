'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, FolderKanban, LayoutDashboard, ListTodo, Plus, Settings, Sparkles, Workflow } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Workspace', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Tasks', href: '/tasks', icon: ListTodo },
  { name: 'Graphs', href: '/graphs', icon: Workflow },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <aside className="hidden md:flex w-[272px] shrink-0 flex-col m-4 rounded-2xl border bg-[var(--bg-card)]/90 backdrop-blur-xl shadow-[var(--shadow-card)]" style={{ borderColor: 'var(--border-color)', height: 'calc(100vh - 2rem)' }}>
        <Brand />
        <div className="px-4 pt-4">
          <Link href="/tasks/new" className="group flex items-center justify-between rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/15 transition-all">
            <span className="flex items-center gap-2"><Plus size={17} className="text-[var(--accent-primary)]" /> New work</span>
            <span className="text-[10px] font-medium text-[var(--text-muted)]">⌘ K</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto" aria-label="Primary navigation">
          <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Workspace</p>
          {navItems.slice(0, 5).map((item) => <NavItem key={item.name} item={item} active={isActive(item.href)} />)}
          <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Account</p>
          <NavItem item={navItems[5]} active={isActive(navItems[5].href)} />
        </nav>
        <div className="p-4 pt-2">
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3.5">
            <div className="flex items-center gap-2"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span><p className="text-xs font-semibold text-[var(--text-primary)]">Execution is live</p></div>
            <p className="text-[11px] leading-relaxed text-[var(--text-muted)] mt-2">Uden shows durable state from the execution system, not simulated progress.</p>
          </div>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-[var(--bg-primary)]/95 backdrop-blur-xl px-2 pb-[env(safe-area-inset-bottom)]" style={{ borderColor: 'var(--border-color)' }} aria-label="Mobile navigation">
        <div className="grid grid-cols-5 h-16">
          {[navItems[0], navItems[1], navItems[2], navItems[4], navItems[5]].map((item) => {
            const active = isActive(item.href); const Icon = item.icon;
            return <Link key={item.name} href={item.href} className={cn('flex flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium transition-colors', active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]')} aria-current={active ? 'page' : undefined}><Icon size={19} /><span>{item.name}</span></Link>;
          })}
        </div>
      </nav>
    </>
  );
}

function Brand() {
  return <div className="px-5 py-5 flex items-center gap-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-[var(--shadow-glow)]" style={{ background: 'var(--accent-gradient)' }}><Sparkles size={18} /></div>
    <div><span className="font-bold text-lg tracking-tight text-[var(--text-primary)] block">Uden</span><span className="text-[9px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Work partner</span></div>
  </div>;
}

function NavItem({ item, active }: { item: typeof navItems[number]; active: boolean }) {
  const Icon = item.icon;
  return <Link href={item.href} aria-current={active ? 'page' : undefined} className={cn('flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200', active ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/40 shadow-[var(--shadow-glow)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] border border-transparent')}><Icon size={17} />{item.name}</Link>;
}
