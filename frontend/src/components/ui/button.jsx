import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                // Primary par emerald gradient + brand-tinted glow (ngo-latest jaisa),
                // neutral grey shadow nahi
                default:
                    'bg-linear-to-r from-brand-500 to-brand-600 text-white shadow-brand hover:from-brand-600 hover:to-brand-700 dark:from-brand-400 dark:to-brand-500 dark:text-brand-950',
                secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-accent',
                outline:
                    'border border-border bg-card shadow-xs hover:bg-accent hover:text-accent-foreground',
                ghost: 'hover:bg-accent hover:text-accent-foreground',
                destructive: 'bg-destructive text-white shadow-xs hover:opacity-90',
                link: 'text-primary underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-10 px-4 py-2',
                sm: 'h-9 rounded-lg px-3 text-sm',
                lg: 'h-11 rounded-xl px-6',
                icon: 'h-10 w-10',
                'icon-sm': 'h-8 w-8',
            },
        },
        defaultVariants: { variant: 'default', size: 'default' },
    }
);

const Button = forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
        <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
    );
});
Button.displayName = 'Button';

export { Button, buttonVariants };
