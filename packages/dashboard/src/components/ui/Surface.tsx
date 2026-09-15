import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export default function Surface({ className, interactive = false, ...props }: SurfaceProps) {
  return (
    <div
      className={cn('surface', interactive && 'surface-interactive', className)}
      {...props}
    />
  );
}

export function InsetSurface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('surface-inset', className)} {...props} />;
}
