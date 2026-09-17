import { cn } from '@/lib/utils';

export const TableWrap = ({ className, ...props }) => (
    <div
        className={cn('w-full overflow-x-auto rounded-lg border border-border bg-card', className)}
        {...props}
    />
);

export const Table = ({ className, ...props }) => (
    <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
);

export const THead = ({ className, ...props }) => (
    <thead className={cn('bg-muted/60 [&_tr]:border-b [&_tr]:border-border', className)} {...props} />
);

export const TBody = ({ className, ...props }) => (
    <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
);

export const TR = ({ className, ...props }) => (
    <tr
        className={cn('border-b border-border transition-colors hover:bg-muted/40', className)}
        {...props}
    />
);

export const TH = ({ className, ...props }) => (
    <th
        className={cn(
            'h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground',
            className
        )}
        {...props}
    />
);

export const TD = ({ className, ...props }) => (
    <td className={cn('px-4 py-3 align-middle', className)} {...props} />
);

export const EmptyRow = ({ colSpan, children = 'Koi record nahi mila' }) => (
    <tr>
        <td colSpan={colSpan} className="px-4 py-14 text-center text-sm text-muted-foreground">
            {children}
        </td>
    </tr>
);

export const LoadingRow = ({ colSpan, rows = 5 }) =>
    Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border">
            <td colSpan={colSpan} className="px-4 py-3">
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
            </td>
        </tr>
    ));
