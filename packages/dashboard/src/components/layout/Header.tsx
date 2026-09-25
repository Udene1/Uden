interface BeforeInstallPromptEvent extends Event {\n  prompt: () => Promise<void>;\n  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;\n}\n\n'use client';

import Link from 'next/link';
import { Command, Download, LogOut, Moon, Plus, Search, Sun, UserRound } from 'lucide-react';
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
  const [mounted, setMounted] = useState(false);\n  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => setMounted(true), []);\n  useEffect(() => {\n    const handleInstall = (event: Event) => {\n      event.preventDefault();\n      setInstallPrompt(event as BeforeInstallPromptEvent);\n    };\n    window.addEventListener('beforeinstallprompt', handleInstall);\n    return () => window.removeEventListener('beforeinstallprompt', handleInstall);\n  }, []);\n\n  const install = async () => {\n    if (!installPrompt) return;\n    await installPrompt.prompt();\n    setInstallPrompt(null);\n  };

  const segment = pathname.split('/')[1] || 'dashboard';
  const title = titles[segment] || 'Workspace';
  const user = session?.user;
  const identity = user?.email || user?.name || 'Workspace member';

  return (
    <>
      <header className="z-10 mx-2 mt-2 flex h-14 shrink-0 items-center justify-between rounded-2xl border bg-[var(--bg-secondary)]/95 px-3 shadow-sm backdrop-blur-xl md:m-3 md:h-16 md:px-5" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex min-w-0 items-center gap-2.5 md:gap-3">
          <div className="hidden h-8 w-8 items-center justify-center rounded-xl border bg-[var(--bg-tertiary)] text-[var(--text-muted)] sm:flex" style={{ borderColor: 'var(--border-color)' }}><Command size={15} /></div>
          <div className="min-w-0"><h1 className="truncate text-[15px] font-bold tracking-[-.02em] text-[var(--text-primary)] md:text-lg">{title}</h1>{segment === 'dashboard' && <p className="mt-0.5 hidden text-xs text-[var(--text-muted)] sm:block">Plan, execute, verify.</p>}</div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <Link href="/tasks/new" aria-label="New work" className="btn btn-secondary h-10 w-10 p-0 sm:hidden"><Plus size={17} /></Link>
          <button type="button" onClick={() => window.dispatchEvent(new Event('uden:command'))} className="btn btn-secondary h-10 rounded-xl px-2.5 sm:h-auto sm:px-3" aria-label="Find work"><Search size={15} /><span className="hidden sm:inline">Find work</span><kbd className="ml-1 hidden rounded border border-[var(--border-color)] px-1.5 py-0.5 text-[10px] md:inline-flex">⌘K</kbd></button>
          {user && <div className="ml-2 hidden items-center gap-2 border-l pl-3 lg:flex" style={{ borderColor: 'var(--border-color)' }}><div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[10px] font-semibold text-[var(--accent-primary)]">{identity.slice(0, 1).toUpperCase()}</div><span className="max-w-40 truncate text-xs text-[var(--text-muted)]" title={identity}>{identity}</span></div>}
          {installPrompt && <button type="button" onClick={() => void install()} className="btn btn-secondary hidden h-10 rounded-xl px-3 sm:inline-flex" aria-label="Install Uden"><Download size={15} /><span className="hidden lg:inline">Install</span></button>}\n          {mounted && <button type="button" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>}
          {user && <Link href="/settings" aria-label="Account settings" title={identity} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] sm:hidden"><UserRound size={17} /></Link>}
          {user && <button type="button" aria-label="Sign out" title="Sign out" onClick={() => void signOut({ callbackUrl: '/login' })} className="hidden h-10 w-10 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] sm:inline-flex"><LogOut size={18} /></button>}
        </div>
      </header>
      <CommandPalette />
    </>
  );
}
