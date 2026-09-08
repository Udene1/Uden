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
  return (
    <aside className="w-64 border-r flex flex-col transition-all duration-300 glass-card m-4 rounded-xl shadow-lg" style={{ borderColor: 'var(--border-color)', height: 'calc(100vh - 2rem)' }}>
      <div className="p-6 flex items-center gap-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: 'var(--accent-gradient)' }}><Sparkles size={18} /></div>
        <div><span className="font-bold text-lg tracking-tight text-[var(--text-primary)] block">Uden</span><span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Work partner</span></div>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto" aria-label="Primary navigation">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return <Link key={item.name} href={item.href} className={cn('flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200', active ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)] border border-[var(--accent-primary)] shadow-[var(--shadow-glow)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] border border-transparent')}><Icon size={18} />{item.name}</Link>;
        })}
      </nav>
      <div className="p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <div className="px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]"><p className="text-xs font-medium text-[var(--text-primary)]">Execution is live</p><p className="text-xs text-[var(--text-muted)] mt-1">Work shown here comes from Uden's APIs.</p></div>
      </div>
    </aside>
  );
}
