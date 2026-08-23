import { cn } from '@/lib/utils';
import { Sparkles, BrainCircuit, Zap } from 'lucide-react';

export default function ModelPill({ model, className }: { model: string, className?: string }) {
  let tier = 'base';
  let Icon = Zap;
  let bgClass = 'bg-gray-500/10 text-gray-400 border-gray-500/20';

  if (model.includes('gpt-4') || model.includes('sonnet') || model.includes('opus')) {
    tier = 'premium';
    Icon = Sparkles;
    bgClass = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  } else if (model.includes('claude-3-haiku') || model.includes('gpt-3.5') || model.includes('flash')) {
    tier = 'fast';
    Icon = BrainCircuit;
    bgClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border", bgClass, className)}>
      <Icon size={10} />
      {model}
    </span>
  );
}
