'use client';
import Link from 'next/link';
import { FolderKanban, Plus, MoreVertical, Activity } from 'lucide-react';
import BudgetBar from '@/components/ui/BudgetBar';
import { formatCurrency } from '@/lib/utils';

const mockProjects = [
  { id: 'proj-1', name: 'Customer Support Bot', description: 'Auto-replies for Zendesk tickets', tasks: 1245, spend: 45000, budget: 100000, status: 'active' },
  { id: 'proj-2', name: 'Data Extraction pipeline', description: 'Extracting JSON from unstructured PDFs', tasks: 890, spend: 89000, budget: 50000, status: 'warning' },
  { id: 'proj-3', name: 'Content Generation', description: 'SEO blog post creation', tasks: 120, spend: 1200, budget: 20000, status: 'active' },
];

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Projects</h2>
          <p className="text-sm text-[var(--text-secondary)]">Group tasks and track budgets by project.</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={16} /> New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockProjects.map(project => (
          <div key={project.id} className="glass-card p-6 border border-[var(--border-color)] flex flex-col gap-4 group">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--accent-primary)] group-hover:scale-110 transition-transform">
                  <FolderKanban size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    <Link href={`/projects/${project.id}`} className="hover:text-[var(--accent-primary)] hover:underline">
                      {project.name}
                    </Link>
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] truncate max-w-[150px]">{project.description}</p>
                </div>
              </div>
              <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <MoreVertical size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-y border-[var(--border-color)]">
              <div>
                <div className="text-xs text-[var(--text-secondary)] mb-1 flex items-center gap-1"><Activity size={12}/> Tasks</div>
                <div className="font-mono text-[var(--text-primary)] font-medium">{project.tasks.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-secondary)] mb-1">Spend</div>
                <div className="font-mono text-[var(--text-primary)] font-medium">{formatCurrency(project.spend)}</div>
              </div>
            </div>

            <div className="mt-auto pt-2">
               <BudgetBar spend={project.spend} budget={project.budget} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
