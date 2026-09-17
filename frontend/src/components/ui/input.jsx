import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Input = forwardRef(({ className, type = 'text', invalid, ...props }, ref) => (
    <input
        ref={ref}
        type={type}
        className={cn(
            'flex h-10 w-full rounded-md border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition-colors',
            'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            invalid ? 'border-destructive' : 'border-input',
            className
        )}
        {...props}
    />
));
Input.displayName = 'Input';

const Textarea = forwardRef(({ className, invalid, ...props }, ref) => (
    <textarea
        ref={ref}
        className={cn(
            'flex min-h-20 w-full rounded-md border bg-card px-3 py-2 text-sm text-foreground shadow-sm',
            'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            invalid ? 'border-destructive' : 'border-input',
            className
        )}
        {...props}
    />
));
Textarea.displayName = 'Textarea';

const Select = forwardRef(({ className, invalid, children, ...props }, ref) => (
    <select
        ref={ref}
        className={cn(
            'flex h-10 w-full rounded-md border bg-card px-3 py-2 text-sm text-foreground shadow-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            invalid ? 'border-destructive' : 'border-input',
            className
        )}
        {...props}
    >
        {children}
    </select>
));
Select.displayName = 'Select';

export { Input, Textarea, Select };
