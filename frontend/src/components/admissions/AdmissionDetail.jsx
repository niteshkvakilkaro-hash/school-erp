import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Phone, Mail, MapPin, School, CalendarClock, BellRing, GraduationCap, Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TextField, TextareaField } from '@/components/ui/field';
import { cn, formatDate, toDateInput } from '@/lib/utils';
import { STAGES, PIPELINE, SOURCES, ACTION_LABEL, formatDateTime, toDateTimeInput, ageFrom } from './stages';

function Info({ icon: Icon, label, children }) {
    if (!children) return null;
    return (
        <div className="flex gap-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="break-words text-sm text-foreground">{children}</p>
            </div>
        </div>
    );
}

/** Stage kahan tak pahuncha - enquiry se admitted tak. */
function Progress({ status }) {
    const closed = status === 'rejected' || status === 'withdrawn';
    const at = PIPELINE.indexOf(status);
    return (
        <div className="flex items-center gap-1">
            {PIPELINE.map((s, i) => (
                <div key={s} className="flex-1">
                    <div
                        className={cn(
                            'h-1.5 rounded-full',
                            closed ? 'bg-destructive/30' : i <= at ? 'bg-primary' : 'bg-border'
                        )}
                    />
                    <p className={cn('mt-1 text-[11px]', i === at ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                        {STAGES[s].label}
                    </p>
                </div>
            ))}
        </div>
    );
}

/** id: null = band. */
export function AdmissionDetail({ id, canManage, canAdmit, onClose, onChanged, onEdit, onAdmit, onDelete }) {
    const [a, setA] = useState(null);
    const [move, setMove] = useState(null); // target stage
    const [form, setForm] = useState({ note: '', interviewAt: '', followUpOn: '' });
    const [noteForm, setNoteForm] = useState({ note: '', followUpOn: '' });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        if (!id) return;
        api.get('/admissions/' + id)
            .then(({ data }) => setA(data.data))
            .catch((err) => toast.error(err.message));
    }, [id]);

    useEffect(() => {
        setA(null);
        setMove(null);
        setErrors({});
        setNoteForm({ note: '', followUpOn: '' });
        load();
    }, [load]);

    const startMove = (to) => {
        setErrors({});
        setMove(to);
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(11, 0, 0, 0);
        setForm({
            note: '',
            interviewAt: to === 'interview' ? toDateTimeInput(a.interviewAt || d) : '',
            followUpOn: to === 'rejected' || to === 'withdrawn' ? '' : toDateInput(a.followUpOn),
        });
    };

    const run = async (fn, ok) => {
        setBusy(true);
        setErrors({});
        try {
            const { data } = await fn();
            toast.success(ok || data.message);
            load();
            onChanged?.();
            return true;
        } catch (err) {
            setErrors(err.fieldErrors || {});
            toast.error(err.message);
            return false;
        } finally {
            setBusy(false);
        }
    };

    const confirmMove = async () => {
        const done = await run(() =>
            api.post('/admissions/' + a.id + '/status', {
                status: move,
                note: form.note,
                interviewAt: form.interviewAt ? new Date(form.interviewAt).toISOString() : undefined,
                followUpOn: form.followUpOn,
            })
        );
        if (done) setMove(null);
    };

    const addNote = async () => {
        const done = await run(() => api.post('/admissions/' + a.id + '/notes', noteForm));
        if (done) setNoteForm({ note: '', followUpOn: '' });
    };

    const stage = a ? STAGES[a.status] : null;
    const age = a ? ageFrom(a.dob) : null;

    return (
        <Modal
            open={Boolean(id)}
            onOpenChange={(v) => !v && onClose()}
            title={a ? a.name : 'Loading...'}
            description={a ? a.applicationNo + ' - ' + (a.schoolClass?.name || '') + ' - ' + SOURCES[a.source] : undefined}
            size="lg"
            footer={
                a ? (
                    <>
                        {canManage && a.status !== 'admitted' ? (
                            <>
                                <Button variant="ghost" className="mr-auto text-destructive hover:bg-destructive/10" onClick={() => onDelete(a)}>
                                    <Trash2 /> Delete
                                </Button>
                                <Button variant="outline" onClick={() => onEdit(a)}>
                                    <Pencil /> Edit details
                                </Button>
                            </>
                        ) : null}
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                    </>
                ) : null
            }
        >
            {!a ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Loading...</p>
            ) : (
                <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={stage.tone}>{stage.label}</Badge>
                        {a.followUpDue ? <Badge variant="danger">Follow-up due {formatDate(a.followUpOn)}</Badge> : null}
                        {a.open && a.followUpOn && !a.followUpDue ? (
                            <Badge variant="outline">Follow-up {formatDate(a.followUpOn)}</Badge>
                        ) : null}
                        {a.status === 'interview' && a.interviewAt ? (
                            <Badge variant="warning">Interview {formatDateTime(a.interviewAt)}</Badge>
                        ) : null}
                        {a.student ? <Badge variant="success">Student {a.student.admissionNo}</Badge> : null}
                    </div>

                    <Progress status={a.status} />

                    <div className="grid gap-6 md:grid-cols-5">
                        <div className="space-y-3 md:col-span-2">
                            <Info icon={GraduationCap} label="Bachcha">
                                {[a.gender && a.gender[0].toUpperCase() + a.gender.slice(1), age !== null ? age + ' saal' : null, a.dob ? formatDate(a.dob) : null]
                                    .filter(Boolean)
                                    .join(' - ') || '-'}
                            </Info>
                            <Info icon={Phone} label="Parent">
                                {[a.fatherName, a.motherName].filter(Boolean).join(' / ') || '-'}
                                <a href={'tel:' + a.guardianPhone} className="block font-medium text-primary">
                                    {a.guardianPhone}
                                </a>
                            </Info>
                            <Info icon={Mail} label="Email">{a.guardianEmail}</Info>
                            <Info icon={MapPin} label="Address">{[a.address, a.city].filter(Boolean).join(', ')}</Info>
                            <Info icon={School} label="Pichhla school">{a.previousSchool}</Info>
                            <Info icon={CalendarClock} label="Enquiry">
                                {formatDate(a.createdAt)}
                                {a.createdBy ? ' - ' + a.createdBy.name : ''}
                            </Info>
                        </div>

                        <div className="space-y-4 md:col-span-3">
                            {a.status === 'approved' && canAdmit ? (
                                <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-accent p-3">
                                    <p className="text-sm text-accent-foreground">Application approved - ab student bana sakte hain</p>
                                    <Button size="sm" onClick={() => onAdmit(a)}>
                                        Admit student
                                    </Button>
                                </div>
                            ) : null}

                            {canManage && a.next.length ? (
                                <div className="rounded-xl border border-border p-3">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stage badliye</p>
                                    <div className="flex flex-wrap gap-2">
                                        {a.next.map((s) => (
                                            <Button
                                                key={s}
                                                size="sm"
                                                variant={move === s ? 'default' : s === 'rejected' || s === 'withdrawn' ? 'ghost' : 'outline'}
                                                className={cn((s === 'rejected' || s === 'withdrawn') && move !== s && 'text-destructive hover:bg-destructive/10')}
                                                onClick={() => startMove(s)}
                                            >
                                                {ACTION_LABEL[s]}
                                            </Button>
                                        ))}
                                    </div>
                                    {move ? (
                                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                            {move === 'interview' ? (
                                                <TextField
                                                    label="Interview kab"
                                                    name="interviewAt"
                                                    type="datetime-local"
                                                    required
                                                    value={form.interviewAt}
                                                    onChange={(e) => setForm((f) => ({ ...f, interviewAt: e.target.value }))}
                                                    error={errors.interviewAt}
                                                />
                                            ) : null}
                                            {move !== 'rejected' && move !== 'withdrawn' ? (
                                                <TextField
                                                    label="Follow-up"
                                                    name="followUpOn"
                                                    type="date"
                                                    value={form.followUpOn}
                                                    onChange={(e) => setForm((f) => ({ ...f, followUpOn: e.target.value }))}
                                                    error={errors.followUpOn}
                                                />
                                            ) : null}
                                            <TextareaField
                                                label={move === 'rejected' || move === 'withdrawn' ? 'Reason' : 'Note'}
                                                name="moveNote"
                                                rows={2}
                                                required={move === 'rejected' || move === 'withdrawn'}
                                                className="sm:col-span-2"
                                                value={form.note}
                                                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                                                error={errors.note}
                                            />
                                            <div className="flex gap-2 sm:col-span-2">
                                                <Button size="sm" onClick={confirmMove} disabled={busy}>
                                                    {busy ? 'Saving...' : 'Confirm: ' + STAGES[move].label}
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => setMove(null)} disabled={busy}>
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}

                            {canManage ? (
                                <div className="rounded-xl border border-border p-3">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Note / call ka hisaab
                                    </p>
                                    <TextareaField
                                        name="note"
                                        rows={2}
                                        placeholder="Kya baat hui..."
                                        value={noteForm.note}
                                        onChange={(e) => setNoteForm((f) => ({ ...f, note: e.target.value }))}
                                        error={errors.note && !move ? errors.note : undefined}
                                    />
                                    <div className="mt-2 flex flex-wrap items-end gap-2">
                                        {a.open ? (
                                            <TextField
                                                label="Agla follow-up"
                                                name="noteFollowUp"
                                                type="date"
                                                className="w-44"
                                                value={noteForm.followUpOn}
                                                onChange={(e) => setNoteForm((f) => ({ ...f, followUpOn: e.target.value }))}
                                            />
                                        ) : null}
                                        <Button size="sm" variant="outline" onClick={addNote} disabled={busy || noteForm.note.trim().length < 2}>
                                            Add note
                                        </Button>
                                    </div>
                                </div>
                            ) : null}

                            <div>
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline</p>
                                <ol className="space-y-0">
                                    {[...a.logs].reverse().map((l, i, arr) => (
                                        <li key={l.id} className="relative flex gap-3 pb-4 last:pb-0">
                                            {i < arr.length - 1 ? <span className="absolute left-[5px] top-4 h-full w-px bg-border" /> : null}
                                            <span
                                                className={cn(
                                                    'relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full',
                                                    l.toStatus ? STAGES[l.toStatus]?.dot || 'bg-primary' : 'border-2 border-border bg-card'
                                                )}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm text-foreground">
                                                    {l.toStatus ? (
                                                        <span className="font-medium">
                                                            {l.fromStatus ? STAGES[l.fromStatus]?.label + ' → ' : ''}
                                                            {STAGES[l.toStatus]?.label}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 font-medium">
                                                            <BellRing className="h-3.5 w-3.5" /> Note
                                                        </span>
                                                    )}
                                                </p>
                                                {l.note ? <p className="mt-0.5 whitespace-pre-line text-sm text-muted-foreground">{l.note}</p> : null}
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    {formatDateTime(l.createdAt)}
                                                    {l.user ? ' - ' + l.user.name : ''}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
}
