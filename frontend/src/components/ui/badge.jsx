import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
    {
        variants: {
            variant: {
                default: 'border-transparent bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200',
                secondary: 'border-transparent bg-secondary text-secondary-foreground',
                outline: 'border-border text-muted-foreground',
                success: 'border-transparent bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200',
                warning: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
                danger: 'border-transparent bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
                muted: 'border-transparent bg-muted text-muted-foreground',
            },
        },
        defaultVariants: { variant: 'default' },
    }
);

export const Badge = ({ className, variant, ...props }) => (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
);

/** active / inactive / alumni ko ek jaisa dikhane ke liye */
export const StatusBadge = ({ status }) => {
    const map = { active: 'success', inactive: 'muted', alumni: 'warning' };
    return (
        <Badge variant={map[status] || 'outline'} className="capitalize">
            {status || 'unknown'}
        </Badge>
    );
};
