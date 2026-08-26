import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  /** 進度條填色是否用流動漸層 */
  flow?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, flow = true, ...props }, ref) => {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  return (
    <ProgressPrimitive.Root
      ref={ref}
      value={pct}
      className={cn(
        'relative h-3 w-full overflow-hidden rounded-2xl bg-surface-2 shadow-inner-soft',
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          'h-full rounded-2xl transition-[width] duration-500 ease-spring',
          flow ? 'flow-bar' : 'bg-primary-500',
        )}
        style={{ width: `${pct}%` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = 'Progress';

export { Progress };
