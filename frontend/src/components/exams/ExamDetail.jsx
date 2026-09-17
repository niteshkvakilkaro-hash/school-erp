import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, ClipboardList, Trophy } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TextField, SelectField } from '@/components/ui/field';
import { MarksSheet } from './MarksSheet';
import { formatDate, cn } from '@/lib/utils';

const BLANK = { subjectId: '', examDate: '', startTime: '10:00', endTime: '12:00', maxMarks: 100, passMarks: 33, roomNo: '' };

const GRADE_TONE = (g) => {
    if (!g) return 'muted';
    if (['A1', 'A2'].includes(g)) return 'success';
    if (['E'].includes(g)) return 'danger';
    return 'secondary';
};

/**
 * Ek exam ka poora andar ka kaam: datesheet banana, har paper ke marks bharna
 * aur class ka result dekhna - sab ek modal me tabs ke through.
 */
export function ExamDetail({ examId, onClose, onChanged }) {
    const { can } = useAuth();
    const canManage = can('exams.manage');

    const [tab, setTab] = useState('schedule');
    const [exam, setExam] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const [marksFor, setMarksFor] = useState(null);
    const [adding, setAdding] = useState(false);
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);

    const load = useCallback(() => {
        if (!examId) return;
        setLoading(true);
        api.get('/exams/' + examId)
            .then(({ data }) => {
                setExam(data.data);
                const classId = data.data.classId;
                return api.get('/subjects', {
                    params: { limit: 100, ...(classId ? { classId } : {}) },
                });
            })
            .then(({ data }) => setSubjects(data.data.items))
            .catch((err) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, [examId]);

    useEffect(() => {
        if (!examId) {
            setExam(null);
            setTab('schedule');
            setMarksFor(null);
            setAdding(false);
            return;
        }
        load();
    }, [examId, load]);

    // Result tab khulne par hi class result fetch karte hain
    useEffect(() => {
        if (tab !== 'result' || !examId) return;
        api.get('/exams/' + examId + '/result')
            .then(({ data }) => setResult(data.data))
            .catch((err) => toast.error(err.message));
    }, [tab, examId]);

    const addPaper = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            await api.post('/exams/' + examId + '/schedule', form);
            toast.success('Paper schedule ho gaya');
            setAdding(false);
            setForm(BLANK);
            load();
            onChanged?.();
        } catch (err) {
            setErrors(err.fieldErrors || {});
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        try {
            await api.delete('/exams/schedule/' + deleting.id);
            toast.success('Paper hata diya gaya');
            setDeleting(null);
            load();
            onChanged?.();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const TABS = [
        { key: 'schedule', label: 'Datesheet', icon: ClipboardList },
        { key: 'result', label: 'Class result', icon: Trophy },
    ];

    return (
        <>
            <Modal
                open={Boolean(examId)}
                onOpenChange={(v) => !v && onClose()}
                title={exam?.name || 'Exam'}
                description={
                    exam
                        ? (exam.schoolClass?.name || 'All classes') +
                          ' - ' +
                          formatDate(exam.startDate) +
                          ' to ' +
                          formatDate(exam.endDate)
                        : undefined
                }
                size="lg"
            >
                {loading ? (
                    <div className="h-64 animate-pulse rounded-lg bg-muted" />
                ) : marksFor ? (
                    <MarksSheet scheduleId={marksFor} onBack={() => setMarksFor(null)} onSaved={onChanged} />
                ) : (
                    <div className="space-y-4">
                        <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
                            {TABS.map(({ key, label, icon: Icon }) => (
                                <button
                                    key={key}
                                    onClick={() => setTab(key)}
                                    className={cn(
                                        'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                        tab === key
                                            ? 'bg-card text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    <Icon className="h-4 w-4" /> {label}
                                </button>
                            ))}
                        </div>

                        {tab === 'schedule' ? (
                            <>
                                {canManage ? (
                                    <div className="flex justify-end">
                                        <Button
                                            size="sm"
                                            variant={adding ? 'outline' : 'default'}
                                            onClick={() => setAdding((v) => !v)}
                                        >
                                            <Plus /> {adding ? 'Cancel' : 'Add paper'}
                                        </Button>
                                    </div>
                                ) : null}

                                {adding ? (
                                    <form
                                        onSubmit={addPaper}
                                        className="grid gap-3 rounded-lg border border-border bg-muted/40 p-4 sm:grid-cols-3"
                                    >
                                        <SelectField
                                            label="Subject"
                                            name="subjectId"
                                            required
                                            className="sm:col-span-3"
                                            value={form.subjectId}
                                            onChange={set('subjectId')}
                                            error={errors.subjectId}
                                        >
                                            <option value="">Select subject</option>
                                            {subjects.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name} ({s.code})
                                                </option>
                                            ))}
                                        </SelectField>
                                        <TextField
                                            label="Date"
                                            name="examDate"
                                            type="date"
                                            required
                                            min={exam?.startDate}
                                            max={exam?.endDate}
                                            value={form.examDate}
                                            onChange={set('examDate')}
                                            error={errors.examDate}
                                        />
                                        <TextField label="Start" name="startTime" type="time" value={form.startTime} onChange={set('startTime')} />
                                        <TextField label="End" name="endTime" type="time" value={form.endTime} onChange={set('endTime')} />
                                        <TextField label="Max marks" name="maxMarks" type="number" min="1" value={form.maxMarks} onChange={set('maxMarks')} error={errors.maxMarks} />
                                        <TextField label="Pass marks" name="passMarks" type="number" min="0" value={form.passMarks} onChange={set('passMarks')} error={errors.passMarks} />
                                        <TextField label="Room" name="roomNo" value={form.roomNo} onChange={set('roomNo')} />
                                        <div className="sm:col-span-3">
                                            <Button type="submit" size="sm" disabled={saving}>
                                                {saving ? 'Saving...' : 'Add to datesheet'}
                                            </Button>
                                        </div>
                                    </form>
                                ) : null}

                                <TableWrap>
                                    <Table>
                                        <THead>
                                            <TR>
                                                <TH>Subject</TH>
                                                <TH>Date</TH>
                                                <TH>Time</TH>
                                                <TH>Marks</TH>
                                                <TH className="text-right">Actions</TH>
                                            </TR>
                                        </THead>
                                        <TBody>
                                            {(exam?.schedule || []).length === 0 ? (
                                                <EmptyRow colSpan={5}>Abhi koi paper schedule nahi hua</EmptyRow>
                                            ) : (
                                                exam.schedule.map((p) => (
                                                    <TR key={p.id}>
                                                        <TD className="font-medium">{p.subject?.name || '-'}</TD>
                                                        <TD className="text-muted-foreground">{formatDate(p.examDate)}</TD>
                                                        <TD className="text-muted-foreground">
                                                            {p.startTime && p.endTime ? p.startTime + ' - ' + p.endTime : '-'}
                                                        </TD>
                                                        <TD>
                                                            {p.passMarks} / {p.maxMarks}
                                                        </TD>
                                                        <TD>
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button variant="outline" size="sm" onClick={() => setMarksFor(p.id)}>
                                                                    Marks
                                                                </Button>
                                                                {canManage ? (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon-sm"
                                                                        title="Remove paper"
                                                                        className="text-destructive hover:bg-destructive/10"
                                                                        onClick={() => setDeleting(p)}
                                                                    >
                                                                        <Trash2 />
                                                                    </Button>
                                                                ) : null}
                                                            </div>
                                                        </TD>
                                                    </TR>
                                                ))
                                            )}
                                        </TBody>
                                    </Table>
                                </TableWrap>
                            </>
                        ) : null}

                        {tab === 'result' ? (
                            <TableWrap>
                                <Table>
                                    <THead>
                                        <TR>
                                            <TH className="w-14">Rank</TH>
                                            <TH>Student</TH>
                                            <TH>Section</TH>
                                            <TH>Total</TH>
                                            <TH>Percent</TH>
                                            <TH>Grade</TH>
                                        </TR>
                                    </THead>
                                    <TBody>
                                        {!result ? (
                                            <EmptyRow colSpan={6}>Load ho raha hai...</EmptyRow>
                                        ) : result.rows.length === 0 ? (
                                            <EmptyRow colSpan={6}>
                                                Abhi koi result nahi - pehle datesheet aur marks bhariye
                                            </EmptyRow>
                                        ) : (
                                            result.rows.map((r) => (
                                                <TR key={r.studentId}>
                                                    <TD className="font-semibold text-foreground">
                                                        {r.rank ?? '-'}
                                                    </TD>
                                                    <TD>
                                                        <p className="font-medium text-foreground">{r.name}</p>
                                                        <p className="font-mono text-xs text-muted-foreground">
                                                            {r.admissionNo}
                                                        </p>
                                                    </TD>
                                                    <TD>{r.sectionName || '-'}</TD>
                                                    <TD className="text-muted-foreground">
                                                        {r.totalObtained ?? '-'} / {result.totalMax}
                                                    </TD>
                                                    <TD className="font-medium">
                                                        {r.percent != null ? r.percent + '%' : '-'}
                                                    </TD>
                                                    <TD>
                                                        {r.grade ? (
                                                            <Badge variant={GRADE_TONE(r.grade)}>{r.grade}</Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </TD>
                                                </TR>
                                            ))
                                        )}
                                    </TBody>
                                </Table>
                            </TableWrap>
                        ) : null}
                    </div>
                )}
            </Modal>

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={'Remove ' + (deleting?.subject?.name || 'paper') + '?'}
                message="Jis paper ke marks bhare ja chuke hain wo hataya nahi ja sakta."
                onConfirm={confirmDelete}
            />
        </>
    );
}
