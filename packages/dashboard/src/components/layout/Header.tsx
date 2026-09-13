'use client';

import Link from 'next/link';
import { Command, LogOut, Moon, Search, Sun } from 'lucide-react';
import { usePathname } from 'next/navigation';
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

  return <header className="h-[68px] shrink-0 flex items-center justify-between px-4 md:px-6 m-2 md:m-4 rounded-2xl border bg-[var(--bg-card)]/85 backdrop-blur-xl shadow-sm z-10" style={{ borderColor: 'var(--border-color)' }}>
    <div className="min-w-0 flex items-center gap-3">
      <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)]"><Command size={15} /></div>
      <div className="min-w-0"><h1 className="text-base md:text-lg font-semibold text-[var(--text-primary)] truncate">{title}</h1>{segment === 'dashboard' && <p className="hidden sm:block text-xs text-[var(--text-muted)] mt-0.5">Plan, execute, verify.</p>}</div>
    </div>
    <div className="flex items-center gap-1.5 md:gap-2">
      <Link href="/tasks" className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition-colors" aria-label="Find work"><Search size={15} /><span className="hidden sm:inline">Find work</span><kbd className="hidden md:inline-flex ml-1 text-[10px] px-1.5 py-0.5 rounded-md border border-[var(--border-color)]">/</kbd></Link>
      {user && <div className="hidden lg:flex items-center gap-2 ml-2 pl-3 border-l" style={{ borderColor: 'var(--border-color)' }}><div className="h-7 w-7 rounded-full bg-[var(--accent-gradient)] flex items-center justify-center text-[10px] font-bold text-white">{identity.slice(0, 1).toUpperCase()}</div><span className="max-w-40 truncate text-xs text-[var(--text-muted)]" title={identity}>{identity}</span></div>}
      {mounted && <button type="button" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>}
      {user && <button type="button" aria-label="Sign out" title="Sign out" onClick={() => void signOut({ callbackUrl: '/login' })} className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"><LogOut size={18} /></button>}
    </div>
  </header>;
}
