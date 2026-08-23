import { cn } from '@/lib/utils';

export default function QualityScore({ score, size = 'md' }: { score: number, size?: 'sm' | 'md' | 'lg' }) {
  let color = 'text-green-500';
  if (score < 80) color = 'text-yellow-500';
  if (score < 60) color = 'text-red-500';

  const sizeClass = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg'
  }[size];

  const strokeWidth = size === 'sm' ? 2 : size === 'lg' ? 4 : 3;
  const radius = 50 - strokeWidth;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={cn("relative flex items-center justify-center font-bold text-mono", sizeClass, color)}>
      <svg className="absolute inset-0 transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
        <circle
          className="text-gray-700/30"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="50"
          cy="50"
        />
        <circle
          className={cn("transition-all duration-1000 ease-out")}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="50"
          cy="50"
        />
      </svg>
      <span>{score}</span>
    </div>
  );
}
