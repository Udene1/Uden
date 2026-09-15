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

  return (
    <>
      <aside className="m-4 hidden w-64 shrink-0 flex-col rounded-xl border bg-[var(--bg-secondary)] md:flex" style={{ borderColor: 'var(--border-color)', height: 'calc(100vh - 2rem)' }}>
        <Brand />
        <div className="p-4">
          <Link href="/tasks/new" className="btn btn-primary w-full justify-between" aria-label="Start new work">
            <span className="flex items-center gap-2"><Plus size={16} /> New work</span>
            <span className="text-[10px] opacity-70">⌘ K</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-3" aria-label="Primary navigation">
          <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Workspace</p>
          {primary.map((item) => <NavItem key={item.name} item={item} active={isActive(item.href)} />)}
          <p className="px-3 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Account</p>
          <NavItem item={navItems[5]} active={isActive(navItems[5].href)} />
        </nav>
        <div className="border-t p-4" style={{ borderColor: 'var(--border-color)' }}>
          <div className="surface-inset p-3">
            <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[var(--status-success)]" /><p className="text-xs font-medium text-[var(--text-primary)]">Execution connected</p></div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--text-muted)]">Recorded execution state is shown throughout Uden.</p>
          </div>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-[var(--bg-secondary)] px-2 pb-[env(safe-area-inset-bottom)] md:hidden" style={{ borderColor: 'var(--border-color)' }} aria-label="Mobile navigation">
        <div className="grid h-16 grid-cols-5">
          {[navItems[0], navItems[1], navItems[2], navItems[4], navItems[5]].map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return <Link key={item.name} href={item.href} aria-current={active ? 'page' : undefined} className={cn('flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium transition-colors', active ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]')}><Icon size={18} /><span>{item.name}</span></Link>;
          })}
        </div>
      </nav>
    </>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 border-b px-5 py-5" style={{ borderColor: 'var(--border-color)' }}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-highlight)] bg-[var(--bg-tertiary)] text-[var(--accent-primary)]"><Sparkles size={16} /></div>
      <div><span className="block text-base font-semibold tracking-tight text-[var(--text-primary)]">Uden</span><span className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Work partner</span></div>
    </div>
  );
}

function NavItem({ item, active }: { item: typeof navItems[number]; active: boolean }) {
  const Icon = item.icon;
  return <Link href={item.href} aria-current={active ? 'page' : undefined} className={cn('flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors', active ? 'border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]')}><Icon size={16} />{item.name}</Link>;
}
