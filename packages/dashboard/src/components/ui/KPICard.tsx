import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  className?: string;
}

export default function KPICard({ title, value, icon: Icon, trend, subtitle, className }: KPICardProps) {
  return (
    <div className={cn("glass-card p-6 flex flex-col hover:shadow-lg transition-all duration-300", className)}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
          <Icon size={20} className="text-[var(--accent-primary)]" />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            trend.isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
          )}>
            {trend.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div>
        <h3 className="text-[var(--text-secondary)] text-sm font-medium mb-1">{title}</h3>
        <p className="text-2xl font-bold text-[var(--text-primary)] text-mono">{value}</p>
        {subtitle && <p className="text-[var(--text-muted)] text-xs mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
