import { Fragment, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search, Download, ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Select } from '@/components/ui/input';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow, LoadingRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

const when = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
// Kaam ke hisaab se rang - delete / fail laal, badlav peela
const tone = (a) => (/\.delete$|login_failed|cancel/.test(a) ? 'danger' : /\.update$|permissions|undo|password/.test(a) ? 'warning' : /login/.test(a) ? 'secondary' : 'success');
const show = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));

function Changes({ changes }) {
    if (!changes) return <p className="text-xs text-muted-foreground">Koi aur detail nahi</p>;
    if (Array.isArray(changes.added) || Array.isArray(changes.removed)) {
        return (
            <div className="space-y-1 text-xs">
                {changes.added?.length ? <p className="text-foreground"><span className="font-semibold text-primary">Di gayi:</span> {changes.added.join(', ')}</p> : null}
                {changes.removed?.length ? <p className="text-foreground"><span className="font-semibold text-destructive">Hatayi:</span> {changes.removed.join(', ')}</p> : null}
            </div>
        );
    }
    return (
        <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[minmax(8rem,auto)_1fr]">
            {Object.entries(changes).map(([k, v]) => (
                <Fragment key={k}>
                    <dt className="font-medium text-muted-foreground">{k}</dt>
                    <dd className="break-words text-foreground">
                        {v && typeof v === 'object' && 'from' in v ? (
                            <>
                                <span className="text-destructive line-through decoration-destructive/40">{show(v.from)}</span>
                                <span className="mx-1.5 text-muted-foreground">→</span>
                                <span className="font-medium text-primary">{show(v.to)}</span>
                            </>
                        ) : (
                            show(v)
                        )}
                    </dd>
                </Fragment>
            ))}
        </dl>
    );
}

export default function ActivityLog() {
    const [filters, setFilters] = useState({ module: '', userId: '', from: '', to: '' });
    const [searchInput, setSearchInput] = useState('');
    const search = useDebounce(searchInput, 400);
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [opts, setOpts] = useState({ modules: [], users: [] });
    const [open, setOpen] = useState({});

    const params = useCallback(() => {
        const p = {};
        for (const [k, v] of Object.entries(filters)) if (v) p[k] = v;
        if (search) p.search = search;
        return p;
    }, [filters, search]);

    useEffect(() => {
        api.get('/audit/filters').then(({ data: r }) => setOpts(r.data)).catch(() => {});
    }, []);

    useEffect(() => {
        setData(null);
        api.get('/audit', { params: { ...params(), page, limit: 25 } })
            .then(({ data: r }) => setData(r.data))
            .catch((err) => toast.error(err.message));
    }, [params, page]);

    const set = (k) => (e) => {
        setFilters((f) => ({ ...f, [k]: e.target.value }));
        setPage(1);
    };

    const exportCsv = async () => {
        try {
            const { data: blob } = await api.get('/audit/export', { params: params(), responseType: 'blob' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'activity-log.csv';
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        } catch (err) {
            toast.error(err.message);
        }
    };

    return (
        <div>
            <PageHeader
                title="Activity log"
                subtitle="Kisne, kab, kya badla - receipts, fees, marks, attendance, users, roles"
                actions={
                    <Button variant="outline" onClick={exportCsv}>
                        <Download /> CSV
                    </Button>
                }
            />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="w-60 pl-9" placeholder="Naam, receipt, student..." value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setPage(1); }} aria-label="Search" />
                </div>
                <Select aria-label="Module" className="w-40" value={filters.module} onChange={set('module')}>
                    <option value="">Sab modules</option>
                    {opts.modules.map((m) => (
                        <option key={m} value={m}>
                            {m}
                        </option>
                    ))}
                </Select>
                <Select aria-label="User" className="w-48" value={filters.userId} onChange={set('userId')}>
                    <option value="">Sab log</option>
                    {opts.users.map((u) => (
                        <option key={u.userId} value={u.userId}>
                            {u.userName}
                            {u.userRole ? ' (' + u.userRole + ')' : ''}
                        </option>
                    ))}
                </Select>
                <Input type="date" aria-label="Se" className="w-40" value={filters.from} onChange={set('from')} />
                <span className="text-sm text-muted-foreground">se</span>
                <Input type="date" aria-label="Tak" className="w-40" value={filters.to} onChange={set('to')} />
            </div>

            <TableWrap>
                <Table>
                    <THead>
                        <TR>
                            <TH className="w-8" />
                            <TH>Kab</TH>
                            <TH>Kisne</TH>
                            <TH>Kya</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {!data ? (
                            <LoadingRow colSpan={4} />
                        ) : !data.items.length ? (
                            <EmptyRow colSpan={4}>Koi activity nahi mili</EmptyRow>
                        ) : (
                            data.items.map((r) => (
                                <Fragment key={r.id}>
                                    <TR className={cn('cursor-pointer', open[r.id] && 'bg-muted/40')} onClick={() => setOpen((o) => ({ ...o, [r.id]: !o[r.id] }))}>
                                        <TD>
                                            <button type="button" aria-expanded={Boolean(open[r.id])} aria-label="Detail" className="text-muted-foreground">
                                                {open[r.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            </button>
                                        </TD>
                                        <TD className="whitespace-nowrap text-sm text-muted-foreground">{when(r.createdAt)}</TD>
                                        <TD>
                                            <p className="text-sm font-medium text-foreground">{r.userName}</p>
                                            <p className="text-xs text-muted-foreground">{r.userRole || ''}</p>
                                        </TD>
                                        <TD>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant={tone(r.action)}>{r.module}</Badge>
                                                <span className="text-sm text-foreground">{r.summary}</span>
                                            </div>
                                        </TD>
                                    </TR>
                                    {open[r.id] ? (
                                        <TR className="bg-muted/40 hover:bg-muted/40">
                                            <TD />
                                            <TD colSpan={3} className="space-y-2 pb-4">
                                                <Changes changes={r.changes} />
                                                <p className="text-[11px] text-muted-foreground">
                                                    {r.action} · IP {r.ip || '—'}
                                                    {r.userAgent ? ' · ' + r.userAgent.slice(0, 80) : ''}
                                                </p>
                                            </TD>
                                        </TR>
                                    ) : null}
                                </Fragment>
                            ))
                        )}
                    </TBody>
                </Table>
            </TableWrap>
            <Pagination meta={data?.meta} onPage={setPage} />
            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Log sirf likha jaata hai - kisi ke paas ise badalne ya mitane ka option nahi hai. Password / keys kabhi log me nahi aate.
            </p>
        </div>
    );
}
