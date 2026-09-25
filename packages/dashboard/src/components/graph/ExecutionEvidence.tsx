import { CheckCircle2, CircleAlert, FileCheck2, ShieldCheck, WalletCards } from 'lucide-react';

type Node = {
  id: string;
  title: string;
  status: string;
  output?: string;
  error?: string;
  approvalState?: string;
};

type Attempt = {
  node_id: string;
  attempt_number: number;
  model: string;
  provider?: string;
  status: string;
  actual_cost_cents?: number;
  cost_cents?: number;
};

export default function ExecutionEvidence({ nodes, attempts }: { nodes: Node[]; attempts: Attempt[] }) {
  const outputs = nodes.filter((node) => Boolean(node.output));
  const failures = nodes.filter((node) => Boolean(node.error) || node.status === 'failed');
  const approvals = nodes.filter((node) => node.approvalState === 'pending');
  const completedAttempts = attempts.filter((attempt) => attempt.status === 'completed');
  const costCents = attempts.reduce((sum, attempt) => sum + (attempt.actual_cost_cents ?? attempt.cost_cents ?? 0), 0);
  const signals = outputs.length + failures.length + approvals.length + completedAttempts.length;

  return (
    <section className="surface p-4 md:p-6" aria-labelledby="execution-evidence-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 size={17} className="text-[var(--accent-primary)]" />
            <h2 id="execution-evidence-title" className="text-lg font-semibold text-[var(--text-primary)]">Recorded evidence</h2>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--text-secondary)]">
            Only facts already present in the execution record are shown here. Uden does not turn a model response into a correctness claim.
          </p>
        </div>
        <span className="text-xs text-[var(--text-muted)]">{signals} recorded signals</span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <EvidenceItem icon={CheckCircle2} label="Recorded outputs" value={outputs.length} detail="Steps with stored output" />
        <EvidenceItem icon={CheckCircle2} label="Completed attempts" value={completedAttempts.length} detail="Attempts marked completed" />
        <EvidenceItem icon={ShieldCheck} label="Approval boundaries" value={approvals.length} detail="Steps awaiting approval" />
        <EvidenceItem icon={CircleAlert} label="Failures / errors" value={failures.length} detail="Recorded failure signals" danger={failures.length > 0} />
        <EvidenceItem icon={WalletCards} label="Recorded cost" value={costCents === 0 ? '—' : formatCents(costCents)} detail="From recorded attempts" />
      </div>
    </section>
  );
}

function EvidenceItem({
  icon: Icon,
  label,
  value,
  detail,
  danger = false,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number | string;
  detail: string;
  danger?: boolean;
}) {
  return (
    <div className="surface-inset min-w-0 p-3">
      <div className={`flex items-center gap-2 text-xs ${danger ? 'text-[var(--status-danger)]' : 'text-[var(--text-muted)]'}`}>
        <Icon size={14} />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{value}</div>
      <p className="mt-1 text-[11px] text-[var(--text-muted)]">{detail}</p>
    </div>
  );
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(4)}`;
}
