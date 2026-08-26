import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-2xl px-2.5 py-1 text-xs font-bold [&_svg]:size-3.5',
  {
    variants: {
      variant: {
        primary: 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-200',
        secondary:
          'bg-secondary-100 text-secondary-800 dark:bg-secondary-900/50 dark:text-secondary-200',
        accent: 'bg-accent-100 text-accent-800 dark:bg-accent-900/50 dark:text-accent-200',
        success: 'bg-success-100 text-success-700 dark:bg-success-700/40 dark:text-success-100',
        error: 'bg-error-100 text-error-700 dark:bg-error-700/40 dark:text-error-100',
        neutral: 'bg-surface-2 text-muted',
        outline: 'border-2 border-line text-muted',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
