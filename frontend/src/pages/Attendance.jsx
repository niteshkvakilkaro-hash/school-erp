import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, X, Clock, CircleSlash, Save, CalendarDays, Search } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow, LoadingRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn, toDateInput } from '@/lib/utils';

const STATUSES = [
    { key: 'present', label: 'Present', icon: Check, on: 'bg-brand-600 text-white border-brand-600' },
    { key: 'absent', label: 'Absent', icon: X, on: 'bg-red-600 text-white border-red-600' },
    { key: 'leave', label: 'Leave', icon: Clock, on: 'bg-amber-500 text-white border-amber-500' },
    { key: 'half-day', label: 'Half day', icon: CircleSlash, on: 'bg-blue-600 text-white border-blue-600' },
];

const TALLY = [
    { key: 'present', label: 'Present', tone: 'text-brand-700 dark:text-brand-300' },
    { key: 'absent', label: 'Absent', tone: 'text-red-600 dark:text-red-400' },
    { key: 'leave', label: 'Leave', tone: 'text-amber-600 dark:text-amber-400' },
    { key: 'half-day', label: 'Half day', tone: 'text-blue-600 dark:text-blue-400' },
];

export default function Attendance() {
    const { can } = useAuth();
    const canMark = can('attendance.mark');

    const [classes, setClasses] = useState([]);
    const [classId, setClassId] = useState('');
    const [sectionId, setSectionId] = useState('');
    const [date, setDate] = useState(toDateInput(new Date()));
    const [search, setSearch] = useState('');

    const [sheet, setSheet] = useState(null);
    const [marks, setMarks] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get('/classes/options').then(({ data }) => {
            setClasses(data.data);
            if (data.data.length) setClassId(String(data.data[0].id));
        });
    }, []);

    const sections = classes.find((c) => String(c.id) === String(classId))?.sections || [];

    const load = useCallback(() => {
        if (!classId) return;
        setLoading(true);
        const params = { classId, date };
        if (sectionId) params.sectionId = sectionId;

        api.get('/attendance/roster', { params })
            .then(({ data }) => {
                setSheet(data.data);
                // Jo pehle se marked hai wo pre-fill, baaki khaali
                setMarks(
                    Object.fromEntries(
                        data.data.rows.filter((r) => r.status).map((r) => [r.studentId, r.status])
                    )
                );
            })
            .catch((err) => {
                toast.error(err.message);
                setSheet(null);
            })
            .finally(() => setLoading(false));
    }, [classId, sectionId, date]);

    useEffect(() => {
        load();
    }, [load]);

    const rows = useMemo(() => {
        const list = sheet?.rows || [];
        if (!search.trim()) return list;
        const q = search.trim().toLowerCase();
        return list.filter(
            (r) =>
                r.name.toLowerCase().includes(q) ||
                (r.rollNo || '').toLowerCase().includes(q) ||
                r.admissionNo.toLowerCase().includes(q)
        );
    }, [sheet, search]);

    // Live tally - jo abhi screen par set hai usi se ginte hain
    const tally = useMemo(() => {
        const t = { present: 0, absent: 0, leave: 0, 'half-day': 0 };
        for (const r of sheet?.rows || []) {
            const s = marks[r.studentId];
            if (s) t[s] += 1;
        }
        return t;
    }, [sheet, marks]);

    const markedCount = Object.values(tally).reduce((a, b) => a + b, 0);
    const total = sheet?.rows?.length || 0;

    const setAll = (status) =>
        setMarks(Object.fromEntries((sheet?.rows || []).map((r) => [r.studentId, status])));

    const save = async () => {
        const entries = (sheet?.rows || [])
            .filter((r) => marks[r.studentId])
            .map((r) => ({ studentId: r.studentId, status: marks[r.studentId] }));

        if (entries.length === 0) {
            toast.error('Pehle kam se kam ek student ka status chuniye');
            return;
        }

        setSaving(true);
        try {
            const body = { classId: Number(classId), date, entries };
            if (sectionId) body.sectionId = Number(sectionId);
            const { data } = await api.post('/attendance/bulk', body);
            toast.success(data.message);
            load();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <PageHeader
                title="Attendance"
                subtitle="Class chuniye, date chuniye aur ek hi screen par poori class mark kijiye"
                actions={
                    canMark ? (
                        <Button onClick={save} disabled={saving || !sheet}>
                            <Save /> {saving ? 'Saving...' : 'Save attendance'}
                        </Button>
                    ) : null
                }
            />

            {/* ---------- Filters ---------- */}
            <Card className="mb-4">
                <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Select
                        value={classId}
                        onChange={(e) => {
                            setClassId(e.target.value);
                            setSectionId('');
                        }}
                    >
                        <option value="">Select class</option>
                        {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </Select>

                    <Select
                        value={sectionId}
                        onChange={(e) => setSectionId(e.target.value)}
                        disabled={!classId}
                    >
                        <option value="">All sections</option>
                        {sections.map((s) => (
                            <option key={s.id} value={s.id}>
                                Section {s.name}
                            </option>
                        ))}
                    </Select>

                    <div className="relative">
                        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="date"
                            className="pl-9"
                            value={date}
                            max={toDateInput(new Date())}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>

                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Naam ya roll se dhoondhiye"
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* ---------- Tally + bulk buttons ---------- */}
            <div className="mb-4 grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-5">
                        <div className="rounded-lg border border-border p-3">
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-xl font-semibold text-foreground">{total}</p>
                        </div>
                        {TALLY.map((t) => (
                            <div key={t.key} className="rounded-lg border border-border p-3">
                                <p className="text-xs text-muted-foreground">{t.label}</p>
                                <p className={cn('text-xl font-semibold', t.tone)}>{tally[t.key]}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex flex-col justify-center gap-3 p-4">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-sm text-muted-foreground">
                                {markedCount} / {total} marked
                            </p>
                            {sheet?.alreadyMarked ? (
                                <Badge variant="success">Saved</Badge>
                            ) : (
                                <Badge variant="muted">Not saved</Badge>
                            )}
                        </div>
                        {canMark ? (
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={() => setAll('present')}>
                                    Sab present
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setMarks({})}>
                                    Clear
                                </Button>
                            </div>
                        ) : null}
                        {sheet?.markedBy ? (
                            <p className="text-xs text-muted-foreground">
                                Pehle {sheet.markedBy} ne mark kiya tha
                            </p>
                        ) : null}
                    </CardContent>
                </Card>
            </div>

            {/* ---------- Marking sheet ---------- */}
            <TableWrap>
                <Table>
                    <THead>
                        <TR>
                            <TH className="w-16">Roll</TH>
                            <TH>Student</TH>
                            <TH>Section</TH>
                            <TH className="text-right">Status</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <LoadingRow colSpan={4} />
                        ) : !classId ? (
                            <EmptyRow colSpan={4}>Pehle class chuniye</EmptyRow>
                        ) : rows.length === 0 ? (
                            <EmptyRow colSpan={4}>Is class me koi active student nahi mila</EmptyRow>
                        ) : (
                            rows.map((r) => {
                                const current = marks[r.studentId];
                                return (
                                    <TR key={r.studentId}>
                                        <TD className="font-mono text-xs">{r.rollNo || '-'}</TD>
                                        <TD>
                                            <p className="font-medium text-foreground">{r.name}</p>
                                            <p className="font-mono text-xs text-muted-foreground">
                                                {r.admissionNo}
                                            </p>
                                        </TD>
                                        <TD>
                                            {r.sectionName ? (
                                                <Badge variant="secondary">{r.sectionName}</Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TD>
                                        <TD>
                                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                                                {STATUSES.map(({ key, label, icon: Icon, on }) => {
                                                    const active = current === key;
                                                    return (
                                                        <button
                                                            key={key}
                                                            type="button"
                                                            disabled={!canMark}
                                                            title={label}
                                                            onClick={() =>
                                                                setMarks((m) => ({ ...m, [r.studentId]: key }))
                                                            }
                                                            className={cn(
                                                                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                                                                active
                                                                    ? on
                                                                    : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                                                !canMark && 'cursor-not-allowed opacity-60'
                                                            )}
                                                        >
                                                            <Icon className="h-3.5 w-3.5" />
                                                            <span className="hidden sm:inline">{label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </TD>
                                    </TR>
                                );
                            })
                        )}
                    </TBody>
                </Table>
            </TableWrap>

            {canMark && rows.length > 0 ? (
                <div className="mt-4 flex justify-end">
                    <Button onClick={save} disabled={saving}>
                        <Save /> {saving ? 'Saving...' : 'Save attendance'}
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
