'use client';
import { useParams } from 'next/navigation';
import { ArrowLeft, Settings } from 'lucide-react';
import Link from 'next/link';

export default function ProjectDetail() {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/projects" className="p-2 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Customer Support Bot</h2>
          <p className="text-sm text-[var(--text-secondary)] font-mono">{id}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button className="btn btn-secondary"><Settings size={16}/> Settings</button>
        </div>
      </div>

      <div className="glass-card p-12 text-center text-[var(--text-muted)] border border-dashed border-[var(--border-color)]">
        Project detailed view coming soon. Check tasks tab for related executions.
      </div>
    </div>
  );
}
