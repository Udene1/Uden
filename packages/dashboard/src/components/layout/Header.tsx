'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

const titles: Record<string, string> = { dashboard: 'Workspace', tasks: 'Tasks', graphs: 'Execution graphs', projects: 'Projects', analytics: 'Analytics', settings: 'Settings' };

export default function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const segment = pathname.split('/')[1] || 'dashboard';
  const title = titles[segment] || 'Workspace';
  const user = session?.user;
  const identity = user?.email || user?.name || 'Workspace member';
  return <header className="h-16 shrink-0 border-b flex items-center justify-between px-4 md:px-6 glass-card m-2 md:m-4 rounded-xl shadow-sm z-10" style={{ borderColor: 'var(--border-color)' }}>
    <div className="min-w-0"><h1 className="text-base md:text-lg font-semibold text-[var(--text-primary)] truncate">{title}</h1>{segment === 'dashboard' && <p className="hidden sm:block text-xs text-[var(--text-muted)] mt-0.5">Plan, execute, verify.</p>}</div>
    <div className="flex items-center gap-1.5 md:gap-3">
      <Link href="/tasks" aria-label="Find work" className="md:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-full transition-colors"><Search size={19} /></Link>
      <Link href="/tasks" className="relative hidden md:flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-full text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition-colors" aria-label="Find work"><Search size={15} /><span>Find work</span><kbd className="ml-2 text-[10px] px-1.5 py-0.5 rounded border border-[var(--border-color)]">/</kbd></Link>
      {user && <span className="hidden lg:block max-w-40 truncate text-xs text-[var(--text-muted)]" title={identity}>{identity}</span>}
      {mounted && <button type="button" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-full transition-colors">{theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</button>}
      {user && <button type="button" aria-label="Sign out" title="Sign out" onClick={() => void signOut({ callbackUrl: '/login' })} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-full transition-colors"><LogOut size={18} /></button>}
    </div>
  </header>;
}
