import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

/** Ek paper ki marks entry - roll wise, absent checkbox ke saath. */
export function MarksSheet({ scheduleId, onBack, onSaved }) {
    const { can } = useAuth();
    const canEnter = can('exams.marks');

    const [sheet, setSheet] = useState(null);
    const [values, setValues] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        api.get('/exams/schedule/' + scheduleId + '/marks')
            .then(({ data }) => {
                setSheet(data.data);
                setValues(
                    Object.fromEntries(
                        data.data.rows.map((r) => [
                            r.studentId,
                            { marks: r.marksObtained ?? '', absent: r.isAbsent },
                        ])
                    )
                );
            })
            .catch((err) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, [scheduleId]);

    useEffect(() => {
        load();
    }, [load]);

    const max = sheet?.examSubject?.maxMarks ?? 100;
    const pass = sheet?.examSubject?.passMarks ?? 0;

    const setValue = (id, patch) => setValues((v) => ({ ...v, [id]: { ...v[id], ...patch } }));

    const save = async () => {
        const entries = (sheet?.rows || [])
            .map((r) => {
                const v = values[r.studentId] || {};
                const blank = v.marks === '' || v.marks === null || v.marks === undefined;
                // Na marks bhare, na absent - us student ko bhejte hi nahi
                if (!v.absent && blank) return null;
                return {
                    studentId: r.studentId,
                    marksObtained: v.absent ? null : Number(v.marks),
                    isAbsent: Boolean(v.absent),
                };
            })
            .filter(Boolean);

        if (entries.length === 0) {
            toast.error('Pehle kisi student ke marks bhariye');
            return;
        }

        const bad = entries.find((e) => e.marksObtained != null && e.marksObtained > max);
        if (bad) {
            toast.error('Marks ' + max + ' se zyada nahi ho sakte');
            return;
        }

        setSaving(true);
        try {
            const { data } = await api.post('/exams/schedule/' + scheduleId + '/marks', { entries });
            toast.success(data.message);
            load();
            onSaved?.();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="h-64 animate-pulse rounded-lg bg-muted" />;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={onBack}>
                        <ArrowLeft /> Datesheet
                    </Button>
                    <div>
                        <p className="font-medium text-foreground">{sheet?.examSubject?.subject?.name}</p>
                        <p className="text-xs text-muted-foreground">
                            Max {max} &middot; Pass {pass}
                        </p>
                    </div>
                </div>
                {canEnter ? (
                    <Button onClick={save} disabled={saving}>
                        <Save /> {saving ? 'Saving...' : 'Save marks'}
                    </Button>
                ) : null}
            </div>

            <TableWrap>
                <Table>
                    <THead>
                        <TR>
                            <TH className="w-14">Roll</TH>
                            <TH>Student</TH>
                            <TH className="w-32">Marks</TH>
                            <TH className="w-20">Absent</TH>
                            <TH className="w-24">Result</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {(sheet?.rows || []).length === 0 ? (
                            <EmptyRow colSpan={5}>Is class me koi student nahi</EmptyRow>
                        ) : (
                            sheet.rows.map((r) => {
                                const v = values[r.studentId] || {};
                                const num = v.absent || v.marks === '' ? null : Number(v.marks);
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
                                            <Input
                                                type="number"
                                                min="0"
                                                max={max}
                                                className="h-9"
                                                disabled={!canEnter || v.absent}
                                                value={v.absent ? '' : (v.marks ?? '')}
                                                onChange={(e) => setValue(r.studentId, { marks: e.target.value })}
                                                invalid={num != null && num > max}
                                            />
                                        </TD>
                                        <TD>
                                            <input
                                                type="checkbox"
                                                disabled={!canEnter}
                                                checked={Boolean(v.absent)}
                                                onChange={(e) => setValue(r.studentId, { absent: e.target.checked })}
                                                className="h-4 w-4 rounded border-input accent-[var(--primary)]"
                                            />
                                        </TD>
                                        <TD>
                                            {v.absent ? (
                                                <Badge variant="muted">Absent</Badge>
                                            ) : num === null ? (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            ) : num >= pass ? (
                                                <Badge variant="success">Pass</Badge>
                                            ) : (
                                                <Badge variant="danger">Fail</Badge>
                                            )}
                                        </TD>
                                    </TR>
                                );
                            })
                        )}
                    </TBody>
                </Table>
            </TableWrap>
        </div>
    );
}
