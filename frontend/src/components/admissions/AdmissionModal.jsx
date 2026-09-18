import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { TextField, SelectField, TextareaField } from '@/components/ui/field';
import { toDateInput } from '@/lib/utils';
import { SOURCES } from './stages';

const BLANK = {
    firstName: '',
    lastName: '',
    gender: '',
    dob: '',
    classId: '',
    fatherName: '',
    motherName: '',
    guardianPhone: '',
    guardianEmail: '',
    address: '',
    city: '',
    previousSchool: '',
    source: 'walk-in',
    followUpOn: '',
    note: '',
};

/** admission: null = band, {} = nayi enquiry, object = edit */
export function AdmissionModal({ admission, onClose, onSaved }) {
    const isEdit = Boolean(admission?.id);
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [classes, setClasses] = useState([]);

    useEffect(() => {
        if (!admission) return;
        setErrors({});
        if (isEdit) {
            const f = { ...BLANK };
            for (const k of Object.keys(BLANK)) f[k] = admission[k] ?? '';
            f.dob = toDateInput(admission.dob);
            f.followUpOn = toDateInput(admission.followUpOn);
            setForm(f);
        } else {
            // Nayi enquiry par kal ka follow-up default
            const d = new Date();
            d.setDate(d.getDate() + 1);
            setForm({ ...BLANK, followUpOn: toDateInput(d) });
        }
        api.get('/classes/options').then(({ data }) => setClasses(data.data)).catch(() => {});
    }, [admission, isEdit]);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e?.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            const { note, ...rest } = form;
            if (isEdit) {
                await api.put('/admissions/' + admission.id, rest);
                toast.success('Details update ho gayi');
            } else {
                const { data } = await api.post('/admissions', form);
                toast.success(data.message);
            }
            onClose();
            onSaved?.();
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
            title={isEdit ? 'Edit ' + admission.applicationNo : 'New enquiry'}
            description={isEdit ? undefined : 'Bachche aur parent ki basic jaankari - baaki baad me bhar sakte hain'}
            size="lg"
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={saving}>
                        {saving ? 'Saving...' : isEdit ? 'Save' : 'Save enquiry'}
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} className="space-y-6">
                <section>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bachcha</p>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <TextField label="First name" name="firstName" required value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
                        <TextField label="Last name" name="lastName" value={form.lastName} onChange={set('lastName')} error={errors.lastName} />
                        <SelectField label="Class chahiye" name="classId" required value={form.classId} onChange={set('classId')} error={errors.classId}>
                            <option value="">Class chuniye</option>
                            {classes.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </SelectField>
                        <SelectField label="Gender" name="gender" value={form.gender} onChange={set('gender')} error={errors.gender}>
                            <option value="">-</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </SelectField>
                        <TextField label="Date of birth" name="dob" type="date" value={form.dob} onChange={set('dob')} error={errors.dob} />
                        <TextField label="Pichhla school" name="previousSchool" value={form.previousSchool} onChange={set('previousSchool')} error={errors.previousSchool} />
                    </div>
                </section>

                <section>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent / guardian</p>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <TextField label="Father name" name="fatherName" value={form.fatherName} onChange={set('fatherName')} error={errors.fatherName} />
                        <TextField label="Mother name" name="motherName" value={form.motherName} onChange={set('motherName')} error={errors.motherName} />
                        <TextField label="Phone" name="guardianPhone" required inputMode="tel" value={form.guardianPhone} onChange={set('guardianPhone')} error={errors.guardianPhone} />
                        <TextField label="Email" name="guardianEmail" type="email" value={form.guardianEmail} onChange={set('guardianEmail')} error={errors.guardianEmail} />
                        <TextField label="City" name="city" value={form.city} onChange={set('city')} error={errors.city} />
                        <TextField label="Address" name="address" value={form.address} onChange={set('address')} error={errors.address} />
                    </div>
                </section>

                <section>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Enquiry</p>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <SelectField label="Kahan se aaye" name="source" value={form.source} onChange={set('source')}>
                            {Object.entries(SOURCES).map(([k, v]) => (
                                <option key={k} value={k}>
                                    {v}
                                </option>
                            ))}
                        </SelectField>
                        <TextField label="Follow-up date" name="followUpOn" type="date" value={form.followUpOn} onChange={set('followUpOn')} error={errors.followUpOn} hint="Kab dobara call karna hai" />
                        {!isEdit ? (
                            <TextareaField label="Note" name="note" rows={2} className="sm:col-span-3" placeholder="Parent ne kya poocha, fees/transport waghairah" value={form.note} onChange={set('note')} error={errors.note} />
                        ) : null}
                    </div>
                </section>
                <button type="submit" className="hidden" />
            </form>
        </Modal>
    );
}
