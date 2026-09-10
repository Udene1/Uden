'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ListTodo, BarChart3, FolderKanban, Settings, Sparkles, Workflow } from 'lucide-react';
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
      <aside className="hidden md:flex w-64 shrink-0 border-r flex-col glass-card m-4 rounded-xl shadow-lg" style={{ borderColor: 'var(--border-color)', height: 'calc(100vh - 2rem)' }}>
        <Brand />
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto" aria-label="Primary navigation">
          {navItems.map((item) => <NavItem key={item.name} item={item} active={isActive(item.href)} />)}
        </nav>
        <div className="p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <div className="px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <p className="text-xs font-medium text-[var(--text-primary)]">Execution is live</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Work shown here comes from Uden's APIs.</p>
          </div>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-[var(--bg-primary)]/95 backdrop-blur-xl px-2 pb-[env(safe-area-inset-bottom)]" style={{ borderColor: 'var(--border-color)' }} aria-label="Mobile navigation">
        <div className="grid grid-cols-5 h-16">
          {[navItems[0], navItems[1], navItems[2], navItems[4], navItems[5]].map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href} className={cn('flex flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium transition-colors', active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]')} aria-current={active ? 'page' : undefined}>
                <Icon size={19} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function Brand() {
  return (
    <div className="p-6 flex items-center gap-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: 'var(--accent-gradient)' }}><Sparkles size={18} /></div>
      <div><span className="font-bold text-lg tracking-tight text-[var(--text-primary)] block">Uden</span><span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Work partner</span></div>
    </div>
  );
}

function NavItem({ item, active }: { item: typeof navItems[number]; active: boolean }) {
  const Icon = item.icon;
  return <Link href={item.href} aria-current={active ? 'page' : undefined} className={cn('flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200', active ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)] border border-[var(--accent-primary)] shadow-[var(--shadow-glow)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] border border-transparent')}><Icon size={18} />{item.name}</Link>;
}
