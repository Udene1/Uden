import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function CardSkeleton() {
  return (
    <div className="glass-card p-6 flex flex-col gap-4">
      <Skeleton className="w-12 h-12 rounded-lg" />
      <Skeleton className="w-24 h-4 rounded" />
      <Skeleton className="w-32 h-8 rounded" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-4">
      <div className="flex gap-4 border-b border-[var(--border-color)] pb-4">
        <Skeleton className="w-1/4 h-6 rounded" />
        <Skeleton className="w-1/4 h-6 rounded" />
        <Skeleton className="w-1/4 h-6 rounded" />
        <Skeleton className="w-1/4 h-6 rounded" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="w-1/4 h-8 rounded" />
          <Skeleton className="w-1/4 h-8 rounded" />
          <Skeleton className="w-1/4 h-8 rounded" />
          <Skeleton className="w-1/4 h-8 rounded" />
        </div>
      ))}
    </div>
  );
}
