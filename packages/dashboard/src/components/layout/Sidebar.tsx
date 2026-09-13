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
  const primary = navItems.slice(0, 5);
  const account = navItems[5];

  return (
    <>
      <aside className="m-4 hidden w-[272px] shrink-0 flex-col rounded-2xl border bg-[var(--bg-card)]/90 shadow-[var(--shadow-card)] backdrop-blur-xl md:flex" style={{ borderColor: 'var(--border-color)', height: 'calc(100vh - 2rem)' }}>
        <Brand />
        <div className="px-4 pt-4">
          <Link href="/tasks/new" className="group flex min-h-12 items-center justify-between rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/15">
            <span className="flex items-center gap-2"><Plus size={17} className="text-[var(--accent-primary)]" /> New work</span>
            <span className="text-[10px] font-medium text-[var(--text-muted)]">⌘ K</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Primary navigation">
          <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Workspace</p>
          {primary.map((item) => <NavItem key={item.name} item={item} active={isActive(item.href)} />)}
          <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Account</p>
          <NavItem item={account} active={isActive(account.href)} />
        </nav>
        <div className="p-4 pt-2">
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3.5">
            <div className="flex items-center gap-2"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span><p className="text-xs font-semibold text-[var(--text-primary)]">Execution system connected</p></div>
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-muted)]">State shown here comes from recorded execution, not simulated progress.</p>
          </div>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-[var(--bg-primary)]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" style={{ borderColor: 'var(--border-color)' }} aria-label="Mobile navigation">
        <div className="grid h-16 grid-cols-5">
          {[navItems[0], navItems[1], navItems[2], navItems[4], navItems[5]].map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return <Link key={item.name} href={item.href} aria-current={active ? 'page' : undefined} className={cn('flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium transition-colors', active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]')}><Icon size={19} /><span>{item.name}</span></Link>;
          })}
        </div>
      </nav>
    </>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 border-b px-5 py-5" style={{ borderColor: 'var(--border-color)' }}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-[var(--shadow-glow)]" style={{ background: 'var(--accent-gradient)' }}><Sparkles size={18} /></div>
      <div><span className="block text-lg font-bold tracking-tight text-[var(--text-primary)]">Uden</span><span className="text-[9px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Work partner</span></div>
    </div>
  );
}

function NavItem({ item, active }: { item: typeof navItems[number]; active: boolean }) {
  const Icon = item.icon;
  return <Link href={item.href} aria-current={active ? 'page' : undefined} className={cn('flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200', active ? 'border-[var(--accent-primary)]/40 bg-[var(--accent-glow)] text-[var(--accent-primary)] shadow-[var(--shadow-glow)]' : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]')}><Icon size={17} />{item.name}</Link>;
}
