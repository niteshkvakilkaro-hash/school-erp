import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Field, TextField } from '@/components/ui/field';
import { cn, toDateInput } from '@/lib/utils';

/** admission: null = band. Approved application ko student banata hai. */
export function AdmitModal({ admission, onClose, onDone }) {
    const [sections, setSections] = useState(null);
    const [sectionId, setSectionId] = useState(null);
    const [admissionNo, setAdmissionNo] = useState('');
    const [admissionDate, setAdmissionDate] = useState('');
    const [rollNo, setRollNo] = useState('');
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!admission) return;
        setSections(null);
        setErrors({});
        setAdmissionNo('');
        setRollNo('');
        setAdmissionDate(toDateInput(new Date()));
        api.get('/admissions/seats/' + admission.classId)
            .then(({ data }) => {
                setSections(data.data);
                // Sabse zyada khali section pehle se chuna hua
                const best = [...data.data].sort((a, b) => b.seatsLeft - a.seatsLeft)[0];
                setSectionId(best && best.seatsLeft > 0 ? best.id : null);
            })
            .catch((err) => toast.error(err.message));
    }, [admission]);

    const submit = async (e) => {
        e?.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            const { data } = await api.post('/admissions/' + admission.id + '/admit', {
                sectionId,
                admissionNo,
                admissionDate,
                rollNo,
            });
            toast.success(data.message);
            onClose();
            onDone?.(data.data);
        } catch (err) {
            setErrors(err.fieldErrors || {});
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={Boolean(admission)}
            onOpenChange={(v) => !v && onClose()}
            title="Admit student"
            description={admission ? admission.name + ' - ' + (admission.schoolClass?.name || '') : undefined}
            size="md"
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={saving || !sectionId}>
                        {saving ? 'Admitting...' : 'Confirm admission'}
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} className="space-y-4">
                <Field label="Section" error={errors.sectionId}>
                    {sections === null ? (
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : sections.length === 0 ? (
                        <p className="text-sm text-destructive">Is class me koi section nahi hai - pehle section banaiye</p>
                    ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                            {sections.map((s) => {
                                const full = s.seatsLeft <= 0;
                                const on = sectionId === s.id;
                                const pct = Math.min(100, Math.round((s.filled / s.capacity) * 100));
                                return (
                                    <button
                                        type="button"
                                        key={s.id}
                                        disabled={full}
                                        onClick={() => setSectionId(s.id)}
                                        className={cn(
                                            'rounded-xl border p-3 text-left transition-colors',
                                            on ? 'border-primary bg-accent' : 'border-border hover:bg-muted',
                                            full && 'cursor-not-allowed opacity-50'
                                        )}
                                    >
                                        <span className="flex items-center justify-between">
                                            <span className="font-medium text-foreground">Section {s.name}</span>
                                            {on ? <Check className="h-4 w-4 text-primary" /> : null}
                                        </span>
                                        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-border">
                                            <span
                                                className={cn('block h-full rounded-full', full ? 'bg-destructive' : 'bg-primary')}
                                                style={{ width: pct + '%' }}
                                            />
                                        </span>
                                        <span className="mt-1 block text-xs text-muted-foreground">
                                            {full ? 'Full' : s.seatsLeft + ' seats khali'} ({s.filled}/{s.capacity})
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                    <TextField
                        label="Admission no"
                        name="admissionNo"
                        placeholder="Auto"
                        value={admissionNo}
                        onChange={(e) => setAdmissionNo(e.target.value)}
                        error={errors.admissionNo}
                        hint="Khaali = agla number"
                    />
                    <TextField
                        label="Admission date"
                        name="admissionDate"
                        type="date"
                        value={admissionDate}
                        onChange={(e) => setAdmissionDate(e.target.value)}
                        error={errors.admissionDate}
                    />
                    <TextField label="Roll no" name="rollNo" value={rollNo} onChange={(e) => setRollNo(e.target.value)} error={errors.rollNo} />
                </div>
                <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
                    Application ki saari details (naam, DOB, parents, phone, address) student record me copy ho jayengi.
                    Login, fees aur transport baad me Student / Fees / Transport page se.
                </p>
                <button type="submit" className="hidden" />
            </form>
        </Modal>
    );
}
