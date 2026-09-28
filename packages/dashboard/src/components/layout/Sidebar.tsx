'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, FolderKanban, LayoutDashboard, ListTodo, Plus, Settings, Workflow, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

const navItems = [
  { name: 'Workspace', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Tasks', href: '/tasks', icon: ListTodo },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Graphs', href: '/graphs', icon: Workflow },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    const saved = window.localStorage.getItem('uden_sidebar_open');
    if (saved !== null) setOpen(saved === '1');
    const toggle = () => setOpen((value) => {
      const next = !value;
      window.localStorage.setItem('uden_sidebar_open', next ? '1' : '0');
      return next;
    });
    const openMobile = () => setMobileOpen(true);
    window.addEventListener('uden:sidebar-toggle', toggle);
    window.addEventListener('uden:sidebar-mobile', openMobile);
    return () => {
      window.removeEventListener('uden:sidebar-toggle', toggle);
      window.removeEventListener('uden:sidebar-mobile', openMobile);
    };
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  const work = navItems.slice(0, 3);
  const understand = navItems.slice(3, 5);

  return (
    <>
      <aside className={cn('hidden shrink-0 flex-col border-r bg-[var(--bg-secondary)] transition-[width] duration-200 md:flex', open ? 'w-[15.5rem]' : 'w-0 overflow-hidden border-r-0')} style={{ borderColor: 'var(--border-color)', height: '100vh' }}>
        <div className="flex min-w-[15.5rem] flex-1 flex-col">
          <div className="border-b p-4" style={{ borderColor: 'var(--border-color)' }}><Brand /></div>
          <div className="p-4"><Link href="/tasks/new" className="group flex min-h-11 w-full items-center rounded-lg border border-[var(--accent-strong)]/30 bg-[var(--accent-soft)] px-3.5 text-sm font-semibold text-[var(--text-primary)]"><span className="flex items-center gap-2.5"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--accent-strong)] text-white"><Plus size={14} /></span>New work</span></Link></div>
          <NavContent work={work} understand={understand} isActive={isActive} />
        </div>
      </aside>

      <div className={cn('fixed inset-0 z-[100] md:hidden', mobileOpen ? 'pointer-events-auto' : 'pointer-events-none')}>
        <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className={cn('absolute inset-0 bg-black/40 transition-opacity', mobileOpen ? 'opacity-100' : 'opacity-0')} />
        <aside className={cn('relative flex h-full w-[17rem] flex-col border-r bg-[var(--bg-secondary)] shadow-2xl transition-transform', mobileOpen ? 'translate-x-0' : '-translate-x-full')} style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between border-b p-4" style={{ borderColor: 'var(--border-color)' }}><Brand /><button onClick={() => setMobileOpen(false)} aria-label="Close navigation" className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"><X size={18} /></button></div>
          <div className="p-4"><Link href="/tasks/new" className="btn btn-primary w-full"><Plus size={15}/> New work</Link></div>
          <NavContent work={work} understand={understand} isActive={isActive} />
        </aside>
      </div>
    </>
  );
}

function NavContent({ work, understand, isActive }: { work: typeof navItems; understand: typeof navItems; isActive: (href: string) => boolean }) {
  return <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-3" aria-label="Primary navigation">
    <p className="px-3 pb-2 pt-2 text-[9px] font-bold uppercase tracking-[.16em] text-[var(--text-muted)]">Work</p>
    {work.map((item) => <NavItem key={item.name} item={item} active={isActive(item.href)} />)}
    <p className="px-3 pb-2 pt-6 text-[9px] font-bold uppercase tracking-[.16em] text-[var(--text-muted)]">Understand</p>
    {understand.map((item) => <NavItem key={item.name} item={item} active={isActive(item.href)} />)}
    <p className="px-3 pb-2 pt-6 text-[9px] font-bold uppercase tracking-[.16em] text-[var(--text-muted)]">System</p>
    <NavItem item={navItems[5]} active={isActive(navItems[5].href)} />
  </nav>;
}

function Brand() {
  return <div className="flex items-center gap-3"><div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-primary)]"><span className="text-[15px] font-bold">U</span><span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--status-success)]" /></div><div><span className="block text-[15px] font-bold text-[var(--text-primary)]">Uden</span><span className="text-[9px] font-medium uppercase tracking-[.15em] text-[var(--text-muted)]">Work operating system</span></div></div>;
}

function NavItem({ item, active }: { item: typeof navItems[number]; active: boolean }) {
  const Icon = item.icon;
  return <Link href={item.href} aria-current={active ? 'page' : undefined} className={cn('group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition-all', active ? 'border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] shadow-sm' : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]')}><Icon size={16} className={cn(active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]')} />{item.name}</Link>;
}
