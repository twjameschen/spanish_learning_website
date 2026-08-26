import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * shadcn/ui 風格的本地 copy（不是 npm 依賴），色票換成 Camino 專案的。
 * 圓角一律 2xl 起跳，hover 有上浮 + 輕微 scale。
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold',
    'transition-all duration-200 ease-spring select-none',
    'disabled:pointer-events-none disabled:opacity-45',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'bg-primary-500 text-white shadow-soft hover:bg-primary-600 hover:shadow-lift hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98] focus-visible:ring-primary-500',
        secondary:
          'bg-secondary-500 text-ink-900 shadow-soft hover:bg-secondary-600 hover:text-white hover:shadow-lift hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98] focus-visible:ring-secondary-500',
        accent:
          'bg-accent-500 text-ink-800 shadow-soft hover:bg-accent-600 hover:shadow-lift hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98] focus-visible:ring-accent-600',
        outline:
          'border-2 border-line bg-surface text-body hover:border-primary-400 hover:text-primary-600 hover:-translate-y-0.5 hover:shadow-soft active:translate-y-0 focus-visible:ring-primary-400',
        ghost:
          'text-body hover:bg-surface-2 hover:text-primary-600 active:scale-[.98] focus-visible:ring-primary-400',
        danger:
          'bg-error-500 text-white shadow-soft hover:bg-error-600 hover:shadow-lift hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-error-500',
        link: 'text-primary-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 rounded-2xl px-3.5 text-sm [&_svg]:size-4',
        md: 'h-11 rounded-2xl px-5 text-[15px] [&_svg]:size-[18px]',
        lg: 'h-14 rounded-3xl px-7 text-lg [&_svg]:size-5',
        icon: 'size-11 rounded-2xl [&_svg]:size-5',
        'icon-sm': 'size-9 rounded-2xl [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
