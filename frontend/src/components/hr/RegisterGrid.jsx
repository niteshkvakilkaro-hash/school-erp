import { cn } from '@/lib/utils';

const CODE = {
    present: ['P', 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'],
    late: ['L', 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'],
    'half-day': ['H', 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300'],
    absent: ['A', 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'],
    leave: ['LV', 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300'],
    off: ['-', 'text-muted-foreground/60'],
};

export function Legend() {
    return (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {[
                ['present', 'Present'],
                ['late', 'Late'],
                ['half-day', 'Half day'],
                ['absent', 'Absent'],
                ['leave', 'Leave'],
                ['off', 'Weekly off'],
            ].map(([k, l]) => (
                <span key={k} className="inline-flex items-center gap-1.5">
                    <span className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[10px] font-bold', CODE[k][1])}>{CODE[k][0]}</span>
                    {l}
                </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" /> Admin ne badla
            </span>
        </div>
    );
}

/** Staff x din ka grid. canManage ho to khane par click karke badal sakte hain. */
export function RegisterGrid({ data, canManage, today, onCell }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full border-collapse text-xs">
                <thead>
                    <tr className="border-b border-border bg-muted/50">
                        <th className="sticky left-0 z-10 min-w-44 bg-muted/95 px-3 py-2 text-left font-semibold text-foreground backdrop-blur">Staff</th>
                        {data.days.map((d) => (
                            <th key={d.date} className={cn('w-8 px-0.5 py-2 text-center font-medium', d.off ? 'text-muted-foreground/60' : 'text-muted-foreground', d.date === today && 'text-primary')}>
                                {d.day}
                            </th>
                        ))}
                        <th className="px-2 py-2 text-center font-semibold text-foreground">P</th>
                        <th className="px-2 py-2 text-center font-semibold text-foreground">L</th>
                        <th className="px-2 py-2 text-center font-semibold text-foreground">H</th>
                        <th className="px-2 py-2 text-center font-semibold text-foreground">A</th>
                        <th className="px-2 py-2 text-center font-semibold text-foreground">LV</th>
                        <th className="px-3 py-2 text-center font-semibold text-foreground" title="Present + Late + aadha Half-day">Din</th>
                    </tr>
                </thead>
                <tbody>
                    {data.rows.map((row) => (
                        <tr key={row.user.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                            <td className="sticky left-0 z-10 bg-card px-3 py-2">
                                <p className="truncate font-medium text-foreground">{row.user.name}</p>
                                <p className="truncate text-[11px] text-muted-foreground">{row.user.role}</p>
                            </td>
                            {row.cells.map((c, i) => {
                                const day = data.days[i];
                                const future = day.date > today;
                                const [label, cls] = c ? CODE[c.s] || ['?', ''] : ['', ''];
                                const clickable = canManage && !future && c?.s !== 'off';
                                return (
                                    <td key={day.date} className="px-0.5 py-1 text-center">
                                        <button
                                            type="button"
                                            disabled={!clickable}
                                            onClick={() => onCell(row, day.date, c?.s)}
                                            title={day.date + (c ? ' - ' + c.s : '')}
                                            className={cn(
                                                'relative inline-flex h-6 w-7 items-center justify-center rounded text-[10px] font-bold',
                                                cls,
                                                clickable && 'hover:ring-2 hover:ring-primary/40',
                                                !c && !future && !clickable && 'text-muted-foreground'
                                            )}
                                        >
                                            {label}
                                            {c?.m ? <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary" /> : null}
                                        </button>
                                    </td>
                                );
                            })}
                            <td className="px-2 text-center font-medium text-foreground">{row.totals.present}</td>
                            <td className="px-2 text-center font-medium text-foreground">{row.totals.late}</td>
                            <td className="px-2 text-center font-medium text-foreground">{row.totals['half-day']}</td>
                            <td className="px-2 text-center font-medium text-destructive">{row.totals.absent}</td>
                            <td className="px-2 text-center font-medium text-foreground">{row.totals.leave}</td>
                            <td className="px-3 text-center font-semibold text-foreground">{row.worked}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** Register ko CSV me - Excel me khul jata hai. */
export function registerCsv(data) {
    const head = ['Staff', 'Role', ...data.days.map((d) => d.day), 'Present', 'Late', 'Half day', 'Absent', 'Leave', 'Worked days'];
    const lines = data.rows.map((r) => [
        r.user.name,
        r.user.role,
        ...r.cells.map((c) => (c ? CODE[c.s]?.[0] || c.s : '')),
        r.totals.present,
        r.totals.late,
        r.totals['half-day'],
        r.totals.absent,
        r.totals.leave,
        r.worked,
    ]);
    const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    return [head, ...lines].map((l) => l.map(esc).join(',')).join('\n');
}
