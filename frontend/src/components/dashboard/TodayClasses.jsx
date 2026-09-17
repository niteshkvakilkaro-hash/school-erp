import { Link } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Aaj ka schedule. Teacher ko sirf uske apne periods dikhte hain (backend
 * hi filter kar deta hai), baaki sabko poore school ka.
 */
export function TodayClasses({ data, loading }) {
    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle>
                    {data?.forTeacher ? 'Aapki aaj ki classes' : "Today's classes"}
                    {data?.label ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">{data.label}</span>
                    ) : null}
                </CardTitle>
                <Link
                    to="/timetable"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                    Timetable <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </CardHeader>

            <CardContent className="space-y-1">
                {loading ? (
                    <div className="h-40 animate-pulse rounded-lg bg-muted" />
                ) : !data?.dayOfWeek ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        Aaj chhutti hai - koi class nahi
                    </p>
                ) : data.slots.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        Aaj ke liye koi period set nahi hai
                    </p>
                ) : (
                    data.slots.map((s) => (
                        <div
                            key={s.id}
                            className="flex items-center gap-3 rounded-lg px-1 py-2.5 transition-colors hover:bg-muted/50"
                        >
                            <span className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-accent px-2 py-1.5 text-accent-foreground">
                                <Clock className="mb-0.5 h-3 w-3" />
                                <span className="text-[11px] font-semibold leading-none">{s.startTime}</span>
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">{s.subject}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {s.teacherName || 'No teacher'}
                                    {s.roomNo ? ' - ' + s.roomNo : ''}
                                </p>
                            </div>

                            <Badge variant="secondary" className="shrink-0">
                                {s.className}
                                {s.sectionName ? ' - ' + s.sectionName : ''}
                            </Badge>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
