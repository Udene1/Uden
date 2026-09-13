import { CheckCircle2, CircleDashed, Clock3, ShieldAlert, XCircle } from 'lucide-react';

type Props = { status: string; verified?: boolean; className?: string };

const states: Record<string, { label: string; detail: string; icon: typeof CheckCircle2 }> = {
  queued: { label: 'Recorded · queued', detail: 'Accepted by the execution system; work has not completed.', icon: Clock3 },
  running: { label: 'Recorded · executing', detail: 'Execution is in progress. Completion has not been recorded.', icon: CircleDashed },
  'awaiting-approval': { label: 'Human approval required', detail: 'Execution is paused at an enforced approval boundary.', icon: ShieldAlert },
  completed: { label: 'Verified result recorded', detail: 'The execution system recorded a completed outcome.', icon: CheckCircle2 },
  failed: { label: 'Execution failed', detail: 'No verified result was recorded for this run.', icon: XCircle },
  rejected: { label: 'Execution rejected', detail: 'The execution did not produce a verified result.', icon: XCircle },
};

export default function ExecutionTruth({ status, verified, className = '' }: Props) {
  const state = states[status] || { label: `Recorded · ${status}`, detail: 'This state is read from the execution system.', icon: Clock3 };
  const Icon = state.icon;
  const isSuccess = status === 'completed' && verified !== false;
  return <div className={`rounded-xl border p-3 ${isSuccess ? 'border-emerald-500/25 bg-emerald-500/5' : status === 'failed' || status === 'rejected' ? 'border-red-500/25 bg-red-500/5' : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'} ${className}`} role="status">
    <div className="flex items-start gap-2.5"><Icon size={16} className={isSuccess ? 'text-emerald-400' : status === 'failed' || status === 'rejected' ? 'text-red-400' : 'text-[var(--accent-primary)]'} /><div><p className="text-xs font-semibold text-[var(--text-primary)]">{state.label}</p><p className="text-[11px] leading-5 text-[var(--text-secondary)] mt-0.5">{state.detail}</p></div></div>
  </div>;
}
