import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

export function Pagination({ meta, onPage }) {
    if (!meta) return null;
    const { page, totalPages, total, limit } = meta;

    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-3">
            <p className="text-sm text-muted-foreground">
                {from}-{to} of {total} records
            </p>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onPage(page - 1)} disabled={page <= 1}>
                    <ChevronLeft /> Prev
                </Button>
                <span className="px-2 text-sm text-muted-foreground">
                    Page {page} / {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPage(page + 1)}
                    disabled={page >= totalPages}
                >
                    Next <ChevronRight />
                </Button>
            </div>
        </div>
    );
}
