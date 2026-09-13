'use client';

import Link from 'next/link';
import { Command, LogOut, Moon, Plus, Search, Sun, UserRound } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import CommandPalette from '@/components/ui/CommandPalette';

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

  return (
    <>
      <header className="z-10 m-2 flex h-[64px] shrink-0 items-center justify-between rounded-2xl border bg-[var(--bg-card)]/85 px-3 shadow-sm backdrop-blur-xl md:m-4 md:h-[68px] md:px-6" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex min-w-0 items-center gap-2.5 md:gap-3">
          <div className="hidden h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)] sm:flex"><Command size={15} /></div>
          <div className="min-w-0"><h1 className="truncate text-base font-semibold text-[var(--text-primary)] md:text-lg">{title}</h1>{segment === 'dashboard' && <p className="mt-0.5 hidden text-xs text-[var(--text-muted)] sm:block">Plan, execute, verify.</p>}</div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <Link href="/tasks/new" aria-label="New work" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/5 text-[var(--accent-primary)] sm:hidden"><Plus size={17} /></Link>
          <button type="button" onClick={() => window.dispatchEvent(new Event('uden:command'))} className="flex h-10 items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2.5 py-2 text-sm text-[var(--text-muted)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)] sm:h-auto sm:px-3" aria-label="Find work"><Search size={15} /><span className="hidden sm:inline">Find work</span><kbd className="ml-1 hidden rounded-md border border-[var(--border-color)] px-1.5 py-0.5 text-[10px] md:inline-flex">⌘K</kbd></button>
          {user && <div className="ml-2 hidden items-center gap-2 border-l pl-3 lg:flex" style={{ borderColor: 'var(--border-color)' }}><div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-gradient)] text-[10px] font-bold text-white">{identity.slice(0, 1).toUpperCase()}</div><span className="max-w-40 truncate text-xs text-[var(--text-muted)]" title={identity}>{identity}</span></div>}
          {mounted && <button type="button" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>}
          {user && <Link href="/settings" aria-label="Account settings" title={identity} className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] sm:hidden"><UserRound size={17} /></Link>}
          {user && <button type="button" aria-label="Sign out" title="Sign out" onClick={() => void signOut({ callbackUrl: '/login' })} className="hidden h-10 w-10 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] sm:inline-flex"><LogOut size={18} /></button>}
        </div>
      </header>
      <CommandPalette />
    </>
  );
}
