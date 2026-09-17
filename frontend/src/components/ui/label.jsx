import { cn } from '@/lib/utils';

export const Label = ({ className, required, children, ...props }) => (
    <label
        className={cn('text-sm font-medium leading-none text-foreground', className)}
        {...props}
    >
        {children}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
    </label>
);
