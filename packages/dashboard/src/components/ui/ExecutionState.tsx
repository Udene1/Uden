'use client';

import { AlertTriangle, CheckCircle2, Clock3, CircleDashed, HelpCircle, ShieldCheck, XCircle } from 'lucide-react';
import type { TaskStatus } from '@/lib/api';

type Props = { status: TaskStatus };

type StateCopy = { label: string; detail: string; tone: 'neutral' | 'attention' | 'success' | 'danger'; icon: typeof Clock3 };

const copy: Partial<Record<TaskStatus, StateCopy>> = {
  pending: { label: 'Queued', detail: 'The request is recorded and waiting for execution to proceed.', tone: 'neutral', icon: Clock3 },
  classifying: { label: 'Planning', detail: 'Uden is determining how this work should be executed.', tone: 'neutral', icon: CircleDashed },
  routing: { label: 'Routing', detail: 'Uden is selecting the execution path for this work.', tone: 'neutral', icon: CircleDashed },
  processing: { label: 'Executing', detail: 'Execution is in progress. A completed outcome has not been recorded.', tone: 'neutral', icon: CircleDashed },
  'quality-check': { label: 'Verifying', detail: 'The result is being checked before completion is recorded.', tone: 'neutral', icon: ShieldCheck },
  escalating: { label: 'Escalating', detail: 'Uden is moving the work through its recorded escalation path.', tone: 'attention', icon: CircleDashed },
  'awaiting-approval': { label: 'Human approval required', detail: 'Execution is paused at an enforced approval boundary.', tone: 'attention', icon: ShieldCheck },
  approved: { label: 'Approved', detail: 'The recorded approval has been accepted and execution may continue.', tone: 'attention', icon: ShieldCheck },
  completed: { label: 'Completed', detail: 'The execution system recorded a completed outcome.', tone: 'success', icon: CheckCircle2 },
  failed: { label: 'Failed', detail: 'Execution stopped without a verified completed outcome.', tone: 'danger', icon: XCircle },
  rejected: { label: 'Rejected', detail: 'The execution was rejected and did not produce a verified completed outcome.', tone: 'danger', icon: XCircle },
};

const toneClasses = {
  neutral: 'border-[var(--border-color)] bg-[var(--bg-secondary)]',
  attention: 'border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5',
  success: 'border-emerald-500/25 bg-emerald-500/5',
  danger: 'border-[var(--status-danger)]/30 bg-[var(--status-danger)]/5',
};

const iconClasses = {
  neutral: 'text-[var(--accent-primary)]',
  attention: 'text-[var(--accent-primary)]',
  success: 'text-emerald-400',
  danger: 'text-[var(--status-danger)]',
};

export default function ExecutionState({ status }: Props) {
  const state = copy[status] ?? { label: 'State not classified', detail: 'The execution system reported a state that this interface does not currently classify. No stronger conclusion is inferred.', tone: 'attention' as const, icon: HelpCircle };
  const Icon = state.icon;

  return (
    <div className={`rounded-xl border p-4 ${toneClasses[state.tone]}`} role="status" aria-label={`Execution state: ${state.label}`}>
      <div className="flex items-start gap-3">
        <Icon size={18} className={`mt-0.5 shrink-0 ${iconClasses[state.tone]}`} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{state.label}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{state.detail}</p>
        </div>
      </div>
    </div>
  );
}
