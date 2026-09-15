'use client';

import Link from 'next/link';
import { Plus, Search, Workflow } from 'lucide-react';

export default function MobileActionBar() {
  return (
    <div className="md:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] inset-x-3 z-40 pointer-events-none">
      <div className="pointer-events-auto mx-auto flex max-w-sm items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card-strong)]/95 p-2 shadow-xl backdrop-blur-xl">
        <Link href="/tasks/new" className="btn btn-primary flex-1 min-h-11" aria-label="Start new work">
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
