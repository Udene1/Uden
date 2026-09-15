'use client';

import Link from 'next/link';
import { Plus, Search, Workflow } from 'lucide-react';

export default function MobileActionBar() {
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 md:hidden">
      <div className="pointer-events-auto mx-auto flex max-w-sm items-center gap-2 rounded-xl border bg-[var(--bg-elevated)] p-2 shadow-lg" style={{ borderColor: 'var(--border-color)' }}>
        <Link href="/tasks/new" className="btn btn-primary min-h-11 flex-1" aria-label="Start new work">
          <Plus size={17} /> New work
        </Link>
        <Link href="/tasks" className="btn btn-ghost min-h-11 px-3" aria-label="Find work">
          <Search size={18} />
        </Link>
        <Link href="/graphs" className="btn btn-ghost min-h-11 px-3" aria-label="Open execution graphs">
          <Workflow size={18} />
        </Link>
      </div>
    </div>
  );
}
