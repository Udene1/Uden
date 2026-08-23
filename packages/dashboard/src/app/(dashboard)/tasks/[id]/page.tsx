'use client';
import { useParams } from 'next/navigation';
import { ArrowLeft, Clock, DollarSign, CheckCircle, BrainCircuit } from 'lucide-react';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import ModelPill from '@/components/ui/ModelPill';
import QualityScore from '@/components/ui/QualityScore';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { api, Task } from '@/lib/api';
import { Skeleton } from '@/components/ui/LoadingSkeleton';

export default function TaskDetail() {
  const { id } = useParams();
  const [task, setTask] = useState<Task | null>(null);

  useEffect(() => {
    // Simulate fetch
    api.getTasks().then(res => {
      setTask(res.data[0]);
    });
  }, [id]);

  if (!task) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/tasks" className="p-2 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Task {id}</h2>
            <StatusBadge status={task.status} />
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{formatDate(task.createdAt)}</p>
        </div>
        
        {task.status === 'requires_approval' && (
          <div className="ml-auto flex gap-2">
            <button className="btn btn-danger">Reject</button>
            <button className="btn btn-primary"><CheckCircle size={16}/> Approve Execution</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card p-6 border border-[var(--border-color)] space-y-3">
            <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Prompt</h3>
            <div className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] font-mono text-sm text-[var(--text-primary)] whitespace-pre-wrap">
              {task.prompt}
            </div>
          </div>

          <div className="glass-card p-6 border border-[var(--border-color)] space-y-3">
            <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Result</h3>
            <div className="prose prose-invert max-w-none text-sm text-[var(--text-primary)]">
              {task.result || "No result generated yet."}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 border border-[var(--border-color)]">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">Execution Details</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
                  <BrainCircuit size={16} /> Model
                </div>
                <ModelPill model={task.model} />
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
                  <DollarSign size={16} /> Cost
                </div>
                <span className="font-mono font-medium text-[var(--text-primary)]">
                  {formatCurrency(task.costCents)}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
                  <Clock size={16} /> Duration
                </div>
                <span className="font-mono text-[var(--text-primary)]">1.2s</span>
              </div>
              
              <div className="pt-2 flex flex-col items-center">
                <span className="text-xs text-[var(--text-secondary)] mb-2">Quality Check Score</span>
                <QualityScore score={task.qualityScore || 95} size="lg" />
              </div>
            </div>
          </div>
          
          <div className="glass-card p-6 border border-purple-500/20 bg-purple-500/5">
            <h3 className="text-sm font-medium text-purple-400 mb-2">Routing Info</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Task was initially evaluated as low-complexity and routed to <strong>Claude 3 Haiku</strong>. Quality threshold (80%) was met, saving approximately $0.45 compared to default model.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
