'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ListTodo, BarChart3, FolderKanban, Settings, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Tasks', href: '/tasks', icon: ListTodo },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r flex flex-col transition-all duration-300 glass-card m-4 rounded-xl shadow-lg" style={{ borderColor: 'var(--border-color)', height: 'calc(100vh - 2rem)' }}>
      <div className="p-6 flex items-center gap-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: 'var(--accent-gradient)' }}>
          <Sparkles size={18} />
        </div>
        <span className="font-bold text-lg tracking-tight gradient-text">Work Partner</span>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-[var(--accent-glow)] text-[var(--accent-primary)] border border-[var(--accent-primary)] shadow-[var(--shadow-glow)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] border border-transparent"
              )}
            >
              <Icon size={18} className={cn(isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-primary)] font-bold text-xs">
            DC
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-[var(--text-primary)]">Demo Company</span>
            <span className="text-xs text-[var(--text-muted)]">Pro Plan</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
