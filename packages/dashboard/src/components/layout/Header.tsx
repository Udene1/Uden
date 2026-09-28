'use client';

import Link from 'next/link';
import { LogOut, Menu, Moon, Plus, Search, Sun, UserRound } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import CommandPalette from '@/components/ui/CommandPalette';
import { api } from '@/lib/api';

const titles: Record<string, string> = { dashboard: 'Workspace', tasks: 'Tasks', graphs: 'Execution graphs', projects: 'Projects', analytics: 'Analytics', settings: 'Settings' };

export default function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [identity, setIdentity] = useState('');
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && window.sessionStorage.getItem('uden_session')) {
      void api.getCurrentTenant().then(({ tenant }) => setIdentity(tenant.email || tenant.name || 'Workspace member')).catch(() => setIdentity(''));
    }
  }, []);

  const segment = pathname.split('/')[1] || 'dashboard';
  const title = titles[segment] || 'Workspace';
  const user = Boolean(identity);
  const toggleNavigation = () => {
    if (window.innerWidth < 768) window.dispatchEvent(new Event('uden:sidebar-mobile'));
    else window.dispatchEvent(new Event('uden:sidebar-toggle'));
  };

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-[var(--bg-primary)] px-4 md:h-16 md:px-8" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex min-w-0 items-center gap-2.5 md:gap-3">
          <button type="button" onClick={toggleNavigation} aria-label="Open navigation" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] md:h-10 md:w-10" style={{ borderColor: 'var(--border-color)' }}><Menu size={17} /></button>
          <div className="min-w-0"><h1 className="truncate text-[15px] font-bold tracking-[-.02em] text-[var(--text-primary)] md:text-lg">{title}</h1>{segment === 'dashboard' && <p className="mt-0.5 hidden text-xs text-[var(--text-muted)] sm:block">Plan, execute, verify.</p>}</div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <Link href="/tasks/new" aria-label="New work" className="btn btn-secondary h-10 w-10 p-0 sm:hidden"><Plus size={17} /></Link>
          <button type="button" onClick={() => window.dispatchEvent(new Event('uden:command'))} className="btn btn-secondary h-10 rounded-lg px-2.5 sm:h-auto sm:px-3" aria-label="Find work"><Search size={15} /><span className="hidden sm:inline">Find work</span><kbd className="ml-1 hidden rounded border border-[var(--border-color)] px-1.5 py-0.5 text-[10px] md:inline-flex">⌘K</kbd></button>
          {user && <div className="ml-2 hidden items-center gap-2 border-l pl-3 lg:flex" style={{ borderColor: 'var(--border-color)' }}><div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[10px] font-semibold text-[var(--accent-primary)]">{identity.slice(0, 1).toUpperCase()}</div><span className="max-w-40 truncate text-xs text-[var(--text-muted)]">{identity}</span></div>}
          {mounted && <button type="button" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>}
          {user && <Link href="/settings" aria-label="Account settings" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] sm:hidden"><UserRound size={17} /></Link>}
          {user && <button type="button" aria-label="Sign out" onClick={() => void api.logout().then(() => { window.location.href = '/login'; })} className="hidden h-10 w-10 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] sm:inline-flex"><LogOut size={18} /></button>}
        </div>
      </header>
      <CommandPalette />
    </>
  );
}
