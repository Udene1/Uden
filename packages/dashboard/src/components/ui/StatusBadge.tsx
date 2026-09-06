import { cn } from '@/lib/utils';
import { TaskStatus } from '@/lib/api';

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'badge-warning' },
  classifying: { label: 'Classifying', className: 'badge-info animate-pulse' },
  routing: { label: 'Routing', className: 'badge-info animate-pulse' },
  processing: { label: 'Processing', className: 'badge-info animate-pulse' },
  'quality-check': { label: 'Quality Check', className: 'badge-info animate-pulse' },
  escalating: { label: 'Escalating', className: 'badge-warning animate-pulse' },
  completed: { label: 'Completed', className: 'badge-success' },
  failed: { label: 'Failed', className: 'badge-danger' },
  'awaiting-approval': { label: 'Awaiting Approval', className: 'badge-warning border-dashed border-2' },
  approved: { label: 'Approved', className: 'badge-success' },
  rejected: { label: 'Rejected', className: 'badge-danger' },
};

export default function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const config = statusConfig[status];
  if (!config) return null;

  return (
    <span className={cn('badge', config.className, className)}>
      {config.label}
    </span>
  );
}
