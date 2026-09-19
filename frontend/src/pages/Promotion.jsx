import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, GraduationCap, RotateCcw, CalendarPlus, AlertTriangle, History } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Select } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';
import { cn, formatCurrency } from '@/lib/utils';

const GRAD = 'graduate';
const OUTCOMES = [
    ['promoted', 'Promote'],
    ['detained', 'Roko'],
    ['graduated', 'Pass out'],
    ['left', 'Chhod diya'],
];
const OUT_TONE = { promoted: 'success', detained: 'warning', graduated: 'secondary', left: 'muted' };

const fmtDate = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function Promotion() {
    const [plan, setPlan] = useState(null);
    const [runs, setRuns] = useState([]);
    const [toSession, setToSession] = useState('');
    const [classTo, setClassTo] = useState({}); // fromClassId -> toClassId | GRAD
    const [sectionTo, setSectionTo] = useState({}); // fromSectionId -> toSectionId | ''
    const [outcome, setOutcome] = useState({}); // studentId -> outcome (sirf badle hue)
    const [viewClass, setViewClass] = useState('');
    const [resetRoll, setResetRoll] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [busy, setBusy] = useState(false);
    const [undoRun, setUndoRun] = useState(null);

    const load = useCallback(async () => {
        try {
            const [{ data: p }, { data: r }] = await Promise.all([api.get('/sessions/promotion'), api.get('/sessions/runs')]);
            const d = p.data;
            setPlan(d);
            setRuns(r.data);
            setToSession(d.nextSession || '');
            setClassTo(Object.fromEntries(d.classes.map((c) => [c.id, c.defaultTo ?? GRAD])));
            setSectionTo({});
            setOutcome({});
            setViewClass(String(d.classes.find((c) => c.students)?.id || ''));
        } catch (err) {
            toast.error(err.message);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const classById = useMemo(() => new Map((plan?.classes || []).map((c) => [c.id, c])), [plan]);
    const withStudents = (plan?.classes || []).filter((c) => c.students > 0);
    const defaultOutcome = (s) => (classTo[s.classId] === GRAD ? 'graduated' : 'promoted');
    const outcomeOf = (s) => outcome[s.id] || defaultOutcome(s);

    // Target class me section: chuna hua > same naam > akela section
    const targetSection = (fromSectionId, fromClassId) => {
        const to = classTo[fromClassId];
        if (to === GRAD) return null;
        const cls = classById.get(Number(to));
        if (!cls) return null;
        if (fromSectionId && sectionTo[fromSectionId] !== undefined) return sectionTo[fromSectionId] === '' ? null : Number(sectionTo[fromSectionId]);
        const fromName = classById.get(fromClassId)?.sections.find((x) => x.id === fromSectionId)?.name;
        return cls.sections.find((x) => fromName && x.name.toLowerCase() === fromName.toLowerCase())?.id || (cls.sections.length === 1 ? cls.sections[0].id : null);
    };

    const counts = useMemo(() => {
        const c = { promoted: 0, detained: 0, graduated: 0, left: 0, dues: 0, noSection: 0 };
        for (const s of plan?.students || []) {
            const o = outcomeOf(s);
            c[o]++;
            if (s.due > 0) c.dues++;
            if (o === 'promoted') {
                const cls = classById.get(Number(classTo[s.classId]));
                if (cls?.sections.length && !targetSection(s.sectionId, s.classId)) c.noSection++;
            }
        }
        return c;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plan, classTo, sectionTo, outcome]);

    const run = async () => {
        setBusy(true);
        try {
            const body = {
                toSession,
                confirm: confirmText.trim(),
                resetRollNos: resetRoll,
                classMap: withStudents.map((c) => ({ fromClassId: c.id, toClassId: classTo[c.id] === GRAD ? null : Number(classTo[c.id]) })),
                sectionMap: Object.entries(sectionTo)
                    .filter(([from]) => {
                        const cls = plan.classes.find((c) => c.sections.some((x) => x.id === Number(from)));
                        return cls && classTo[cls.id] !== GRAD;
                    })
                    .map(([from, to]) => ({ fromSectionId: Number(from), toSectionId: to === '' ? null : Number(to) })),
                overrides: plan.students.filter((s) => outcome[s.id] && outcome[s.id] !== defaultOutcome(s)).map((s) => ({ studentId: s.id, outcome: outcome[s.id] })),
            };
            const { data } = await api.post('/sessions/promotion', body);
            toast.success(data.message);
            setConfirmOpen(false);
            setConfirmText('');
            load();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    const doUndo = async () => {
        setBusy(true);
        try {
            const { data } = await api.post('/sessions/runs/' + undoRun.id + '/undo');
            toast.success(data.message);
            if (data.data.skipped.length) toast.warning('Nahi badle: ' + data.data.skipped.map((s) => s.name).join(', '), { duration: 10000 });
            setUndoRun(null);
            load();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    if (!plan) return <p className="py-16 text-center text-sm text-muted-foreground">Loading...</p>;

    const undoable = runs.find((r) => r.canUndo);
    const shown = plan.students.filter((s) => String(s.classId) === viewClass);
    const viewCls = classById.get(Number(viewClass));

    return (
        <div className="space-y-6">
            <PageHeader
                title="Naya session"
                subtitle={'Saal ke ant me promotion - abhi ' + (plan.currentSession || 'session set nahi') + ' chal raha hai'}
            />

            {undoable ? (
                <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-500/30 dark:bg-amber-500/10 sm:flex-row sm:items-center">
                    <History className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
                    <p className="flex-1 text-amber-900 dark:text-amber-100">
                        {undoable.fromSession} → {undoable.toSession} promotion {fmtDate(undoable.createdAt)} ko hua ({undoable.promoted} promote, {undoable.detained} roke, {undoable.graduated} pass-out). Galti hui ho to 30 din tak undo kar sakte hain.
                    </p>
                    <Button variant="outline" onClick={() => setUndoRun(undoable)}>
                        <RotateCcw /> Undo
                    </Button>
                </div>
            ) : null}

            <Card>
                <CardHeader>
                    <CardTitle>1. Session</CardTitle>
                    <CardDescription>Attendance, marks, fees ka purana record waisa hi rahega - sirf bachchon ki class badlegi</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-3">
                    <Badge variant="secondary" className="px-3 py-1.5 text-sm">{plan.currentSession || '—'}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Input aria-label="Naya session" className="w-32 font-medium" value={toSession} onChange={(e) => setToSession(e.target.value)} placeholder="2027-28" disabled={Boolean(plan.nextSession)} />
                    {plan.noClass ? <span className="text-sm text-amber-700 dark:text-amber-300">{plan.noClass} active students ki class set nahi - unhe nahi chheda jayega</span> : null}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>2. Har class kahan jayegi</CardTitle>
                    <CardDescription>Sabse upar wali class ke bachche pass-out (Alumni) ho jaate hain</CardDescription>
                </CardHeader>
                <CardContent>
                    <TableWrap>
                        <Table>
                            <THead>
                                <TR>
                                    <TH>Abhi</TH>
                                    <TH>Agle session me</TH>
                                    <TH>Sections</TH>
                                </TR>
                            </THead>
                            <TBody>
                                {!withStudents.length ? (
                                    <EmptyRow colSpan={3}>Kisi class me active student nahi</EmptyRow>
                                ) : (
                                    withStudents.map((c) => {
                                        const to = classTo[c.id];
                                        const toCls = to === GRAD ? null : classById.get(Number(to));
                                        return (
                                            <TR key={c.id}>
                                                <TD>
                                                    <p className="font-medium text-foreground">{c.name}</p>
                                                    <p className="text-xs text-muted-foreground">{c.students} students</p>
                                                </TD>
                                                <TD>
                                                    <Select aria-label={c.name + ' kahan jayegi'} className="w-48" value={String(to)} onChange={(e) => setClassTo((m) => ({ ...m, [c.id]: e.target.value === GRAD ? GRAD : Number(e.target.value) }))}>
                                                        {plan.classes.map((x) => (
                                                            <option key={x.id} value={x.id}>
                                                                {x.id === c.id ? x.name + ' (wahi)' : x.name}
                                                            </option>
                                                        ))}
                                                        <option value={GRAD}>Pass out (Alumni)</option>
                                                    </Select>
                                                </TD>
                                                <TD>
                                                    {!toCls ? (
                                                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                                                            <GraduationCap className="h-4 w-4" /> School se pass-out
                                                        </span>
                                                    ) : !c.sections.length || !toCls.sections.length ? (
                                                        <span className="text-sm text-muted-foreground">{toCls.sections.length ? 'Section: ' + (toCls.sections.length === 1 ? toCls.sections[0].name : 'baad me') : '—'}</span>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-3">
                                                            {c.sections.map((sec) => (
                                                                <label key={sec.id} className="flex items-center gap-1.5 text-sm">
                                                                    <span className="text-muted-foreground">{sec.name} →</span>
                                                                    <Select
                                                                        aria-label={c.name + ' ' + sec.name + ' ka naya section'}
                                                                        className="h-8 w-24"
                                                                        value={String(targetSection(sec.id, c.id) ?? '')}
                                                                        onChange={(e) => setSectionTo((m) => ({ ...m, [sec.id]: e.target.value }))}
                                                                    >
                                                                        <option value="">—</option>
                                                                        {toCls.sections.map((x) => (
                                                                            <option key={x.id} value={x.id}>
                                                                                {x.name}
                                                                            </option>
                                                                        ))}
                                                                    </Select>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    )}
                                                </TD>
                                            </TR>
                                        );
                                    })
                                )}
                            </TBody>
                        </Table>
                    </TableWrap>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>3. Kisi bachche ko rokna / alag karna</CardTitle>
                    <CardDescription>Fail hua to "Roko" (usi class me rahega), school chhod diya to "Chhod diya"</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Select aria-label="Class dekhiye" className="w-56" value={viewClass} onChange={(e) => setViewClass(e.target.value)}>
                        {withStudents.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name} ({c.students})
                            </option>
                        ))}
                    </Select>
                    <TableWrap className="max-h-[55vh] overflow-auto">
                        <Table>
                            <THead>
                                <TR>
                                    <TH>Student</TH>
                                    <TH>Section / Roll</TH>
                                    <TH>Fees baaki</TH>
                                    <TH>Faisla</TH>
                                </TR>
                            </THead>
                            <TBody>
                                {!shown.length ? (
                                    <EmptyRow colSpan={4}>Koi student nahi</EmptyRow>
                                ) : (
                                    shown.map((s) => {
                                        const o = outcomeOf(s);
                                        return (
                                            <TR key={s.id} className={cn(o !== defaultOutcome(s) && 'bg-amber-50/60 dark:bg-amber-500/5')}>
                                                <TD>
                                                    <p className="font-medium text-foreground">{s.name}</p>
                                                    <p className="font-mono text-xs text-muted-foreground">{s.admissionNo}</p>
                                                </TD>
                                                <TD className="text-sm text-muted-foreground">
                                                    {viewCls?.sections.find((x) => x.id === s.sectionId)?.name || '—'} / {s.rollNo || '—'}
                                                </TD>
                                                <TD>{s.due > 0 ? <span className="text-sm font-medium text-destructive">{formatCurrency(s.due)}</span> : <span className="text-sm text-muted-foreground">—</span>}</TD>
                                                <TD>
                                                    <div role="radiogroup" aria-label={s.name + ' ka faisla'} className="inline-flex flex-wrap gap-1">
                                                        {OUTCOMES.map(([k, l]) => (
                                                            <button
                                                                key={k}
                                                                type="button"
                                                                role="radio"
                                                                aria-checked={o === k}
                                                                onClick={() => setOutcome((m) => ({ ...m, [s.id]: k }))}
                                                                className={cn(
                                                                    'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                                                                    o === k ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:text-foreground'
                                                                )}
                                                            >
                                                                {l}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </TD>
                                            </TR>
                                        );
                                    })
                                )}
                            </TBody>
                        </Table>
                    </TableWrap>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>4. Pakka kijiye</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {OUTCOMES.map(([k, l]) => (
                            <Badge key={k} variant={OUT_TONE[k]} className="px-3 py-1 text-sm">
                                {l}: {counts[k]}
                            </Badge>
                        ))}
                    </div>
                    {counts.dues ? (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <AlertTriangle className="h-4 w-4 text-amber-600" /> {counts.dues} students ki purani fees baaki hai - wo unke khate me aage bhi dikhegi.
                        </p>
                    ) : null}
                    {counts.noSection ? (
                        <p className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="h-4 w-4" /> {counts.noSection} promote hone wale bachchon ka naya section tay nahi - upar section chuniye ya baad me Students se lagaiye.
                        </p>
                    ) : null}
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={resetRoll} onChange={(e) => setResetRoll(e.target.checked)} />
                        <span className="text-foreground">Roll number khaali kar dijiye (naye session me dobara denge)</span>
                    </label>
                    <Button size="lg" disabled={!withStudents.length || !toSession} onClick={() => setConfirmOpen(true)}>
                        <CalendarPlus /> {toSession || 'Naya'} session shuru kariye
                    </Button>
                </CardContent>
            </Card>

            {runs.length ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Pichhle promotion</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TableWrap>
                            <Table>
                                <THead>
                                    <TR>
                                        <TH>Session</TH>
                                        <TH>Kab / kisne</TH>
                                        <TH>Promote / Roke / Pass-out / Chhode</TH>
                                        <TH>Status</TH>
                                    </TR>
                                </THead>
                                <TBody>
                                    {runs.map((r) => (
                                        <TR key={r.id}>
                                            <TD className="font-medium text-foreground">
                                                {r.fromSession || '—'} → {r.toSession}
                                            </TD>
                                            <TD className="text-sm text-muted-foreground">
                                                {fmtDate(r.createdAt)}
                                                <br />
                                                {r.createdBy?.name}
                                            </TD>
                                            <TD className="text-sm text-foreground">
                                                {r.promoted} / {r.detained} / {r.graduated} / {r.left}
                                            </TD>
                                            <TD>{r.undoneAt ? <Badge variant="muted">Undo hua</Badge> : <Badge variant="success">Laagu</Badge>}</TD>
                                        </TR>
                                    ))}
                                </TBody>
                            </Table>
                        </TableWrap>
                    </CardContent>
                </Card>
            ) : null}

            <Modal
                open={confirmOpen}
                onOpenChange={(v) => !busy && setConfirmOpen(v)}
                title={'Naya session ' + toSession}
                description={counts.promoted + ' promote, ' + counts.detained + ' roke, ' + counts.graduated + ' pass-out, ' + counts.left + ' chhode'}
                size="sm"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy}>
                            Cancel
                        </Button>
                        <Button onClick={run} disabled={busy || confirmText.trim() !== toSession}>
                            {busy ? 'Chal raha hai...' : 'Shuru kariye'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-3 text-sm">
                    <p className="text-muted-foreground">Sab bachchon ki class ek saath badlegi. Galti hui to 30 din tak undo ho sakta hai.</p>
                    <label className="block space-y-1.5">
                        <span className="font-medium text-foreground">Pakka karne ke liye {toSession} likhiye</span>
                        <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={toSession} aria-label="Session likhiye" />
                    </label>
                </div>
            </Modal>

            <Modal
                open={Boolean(undoRun)}
                onOpenChange={(v) => !v && !busy && setUndoRun(null)}
                title="Promotion undo"
                size="sm"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setUndoRun(null)} disabled={busy}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={doUndo} disabled={busy}>
                            {busy ? 'Undo ho raha hai...' : 'Undo kariye'}
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-muted-foreground">
                    Sab bachche {undoRun?.fromSession} wali class / section me wapas jayenge aur session {undoRun?.fromSession} ho jayega. Jin bachchon ki class promotion ke baad haath se badli gayi, unhe nahi chheda jayega.
                </p>
            </Modal>
        </div>
    );
}
