import { Link } from 'react-router-dom';
import { Megaphone, ArrowRight, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, titleCase, cn } from '@/lib/utils';

const TONE = {
    high: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    medium: 'bg-accent text-accent-foreground',
    low: 'bg-muted text-muted-foreground',
};

/** Dashboard ka notice board - sirf wahi notices jo is user ke liye hain. */
export function NoticeBoard({ items, loading }) {
    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Notices</CardTitle>
                <Link
                    to="/notices"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                    View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </CardHeader>

            <CardContent className="space-y-1">
                {loading ? (
                    <div className="h-40 animate-pulse rounded-lg bg-muted" />
                ) : !items?.length ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        Abhi koi notice nahi hai
                    </p>
                ) : (
                    items.map((n) => (
                        <div
                            key={n.id}
                            className="flex items-start gap-3 rounded-lg px-1 py-2.5 transition-colors hover:bg-muted/50"
                        >
                            <span
                                className={cn(
                                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                    TONE[n.priority] || TONE.medium
                                )}
                            >
                                <Megaphone className="h-4 w-4" />
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                                <p className="truncate text-xs text-muted-foreground">{n.body}</p>
                                {n.eventDate ? (
                                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary">
                                        <CalendarDays className="h-3 w-3" />
                                        {formatDate(n.eventDate)}
                                    </p>
                                ) : null}
                            </div>

                            <Badge variant="outline" className="shrink-0">
                                {titleCase(n.category)}
                            </Badge>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
