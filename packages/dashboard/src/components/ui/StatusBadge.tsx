import { cn } from '@/lib/utils';
import { TaskStatus } from '@/lib/api';

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'badge-warning' },
  running: { label: 'Running', className: 'badge-info animate-pulse' },
  completed: { label: 'Completed', className: 'badge-success' },
  failed: { label: 'Failed', className: 'badge-danger' },
  requires_approval: { label: 'Action Required', className: 'badge-warning border-dashed border-2' },
};

export default function StatusBadge({ status, className }: { status: TaskStatus, className?: string }) {
  const config = statusConfig[status];
  if (!config) return null;

  return (
    <span className={cn("badge", config.className, className)}>
      {config.label}
    </span>
  );
}
