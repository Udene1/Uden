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
      <aside className="m-3 hidden w-[15.5rem] shrink-0 flex-col rounded-2xl border bg-[var(--bg-secondary)] md:flex" style={{ borderColor: 'var(--border-color)', height: 'calc(100vh - 1.5rem)' }}>
        <Brand />
        <div className="p-3">
          <Link href="/tasks/new" className="group flex min-h-11 w-full items-center justify-between rounded-xl border border-[var(--accent-strong)]/30 bg-[var(--accent-soft)] px-3.5 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent-strong)]/50 hover:bg-[var(--accent-soft)]" aria-label="Start new work">
            <span className="flex items-center gap-2.5"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--accent-strong)] text-white"><Plus size={14} /></span>New work</span>
            <kbd className="rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] px-1.5 py-0.5 text-[9px] text-[var(--text-muted)]">⌘ K</kbd>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 pb-3" aria-label="Primary navigation">
          <p className="px-3 pb-2 pt-2 text-[9px] font-bold uppercase tracking-[.16em] text-[var(--text-muted)]">Workspace</p>
          {primary.map((item) => <NavItem key={item.name} item={item} active={isActive(item.href)} />)}
          <p className="px-3 pb-2 pt-6 text-[9px] font-bold uppercase tracking-[.16em] text-[var(--text-muted)]">Account</p>
          <NavItem item={navItems[5]} active={isActive(navItems[5].href)} />
        </nav>
        <div className="border-t p-3" style={{ borderColor: 'var(--border-color)' }}>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-3">
            <div className="flex items-center gap-2"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--status-success)] opacity-40" /><span className="relative h-2 w-2 rounded-full bg-[var(--status-success)]" /></span><p className="text-xs font-semibold text-[var(--text-primary)]">Execution connected</p></div>
            <p className="mt-1.5 pl-4 text-[10px] leading-relaxed text-[var(--text-muted)]">Durable state is visible across your work.</p>
          </div>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-[var(--bg-secondary)]/95 px-2 pt-1.5 backdrop-blur-xl md:hidden" style={{ borderColor: 'var(--border-color)' }} aria-label="Mobile navigation">
        <div className="mx-auto grid h-[3.65rem] max-w-md grid-cols-5">
          {[navItems[0], navItems[1], navItems[2], navItems[4], navItems[5]].map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return <Link key={item.name} href={item.href} aria-current={active ? 'page' : undefined} className={cn('relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-semibold transition-all', active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]')}><span className={cn('flex h-7 w-9 items-center justify-center rounded-lg transition', active && 'bg-[var(--accent-soft)]')}><Icon size={18} strokeWidth={active ? 2.2 : 1.8} /></span><span>{item.name}</span>{active && <span className="absolute bottom-0 h-0.5 w-5 rounded-full bg-[var(--accent-primary)]" />}</Link>;
          })}
        </div>
      </nav>
    </>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 border-b px-4 py-4" style={{ borderColor: 'var(--border-color)' }}>
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-primary)]"><Sparkles size={17} /><span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--status-success)]" /></div>
      <div><span className="block text-[15px] font-bold tracking-[-.02em] text-[var(--text-primary)]">Uden</span><span className="text-[9px] font-medium uppercase tracking-[.15em] text-[var(--text-muted)]">AI work system</span></div>
    </div>
  );
}

function NavItem({ item, active }: { item: typeof navItems[number]; active: boolean }) {
  const Icon = item.icon;
  return <Link href={item.href} aria-current={active ? 'page' : undefined} className={cn('group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition-all', active ? 'border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] shadow-sm' : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]')}><Icon size={16} className={cn('transition-colors', active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]')} />{item.name}</Link>;
}
