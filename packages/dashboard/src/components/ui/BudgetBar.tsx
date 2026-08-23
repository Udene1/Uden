export default function BudgetBar({ spend, budget }: { spend: number, budget: number }) {
  const percentage = Math.min(100, Math.max(0, (spend / budget) * 100));
  
  let color = 'var(--status-success)';
  if (percentage > 75) color = 'var(--status-warning)';
  if (percentage > 90) color = 'var(--status-danger)';

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-2">
        <span className="text-[var(--text-secondary)] font-medium">Budget Utilization</span>
        <span className="text-mono font-bold text-[var(--text-primary)]">{percentage.toFixed(1)}%</span>
      </div>
      <div className="h-3 w-full bg-[var(--bg-secondary)] rounded-full overflow-hidden border border-[var(--border-color)]">
        <div 
          className="h-full rounded-full transition-all duration-1000 ease-out shadow-[var(--shadow-glow)]"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}`
          }}
        />
      </div>
    </div>
  );
}
