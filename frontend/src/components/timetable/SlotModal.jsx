import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { SelectField, TextField } from '@/components/ui/field';

/** Grid ke ek cell me subject + teacher set karta hai. */
export function SlotModal({ slot, classId, sectionId, teachers, onClose, onSaved }) {
    const [subjects, setSubjects] = useState([]);
    const [form, setForm] = useState({ subjectId: '', teacherId: '', roomNo: '' });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!slot) return;
        setErrors({});
        setForm({
            subjectId: slot.existing?.subjectId || '',
            teacherId: slot.existing?.teacherId || '',
            roomNo: slot.existing?.roomNo || '',
        });

        api.get('/subjects', { params: { classId, limit: 100 } })
            .then(({ data }) => setSubjects(data.data.items))
            .catch(() => setSubjects([]));
    }, [slot, classId]);

    // Subject chunte hi uska default teacher bhar dete hain
    const pickSubject = (e) => {
        const id = e.target.value;
        const subject = subjects.find((s) => String(s.id) === id);
        setForm((f) => ({
            ...f,
            subjectId: id,
            teacherId: f.teacherId || (subject?.teacherId ? String(subject.teacherId) : ''),
        }));
    };

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            const { data } = await api.post('/timetable/slots', {
                classId,
                sectionId,
                periodId: slot.periodId,
                dayOfWeek: slot.dayOfWeek,
                subjectId: form.subjectId,
                teacherId: form.teacherId || null,
                roomNo: form.roomNo || undefined,
            });
            toast.success(data.message);
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
            open={Boolean(slot)}
            onOpenChange={(v) => !v && onClose()}
            title={slot?.existing ? 'Edit slot' : 'Add slot'}
            description={slot ? slot.dayLabel + ' - ' + slot.periodName : undefined}
            size="sm"
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={saving}>
                        {saving ? 'Saving...' : 'Save slot'}
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} className="space-y-4">
                <SelectField
                    label="Subject"
                    name="subjectId"
                    required
                    value={form.subjectId}
                    onChange={pickSubject}
                    error={errors.subjectId}
                >
                    <option value="">Select subject</option>
                    {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name} ({s.code})
                        </option>
                    ))}
                </SelectField>

                <SelectField
                    label="Teacher"
                    name="teacherId"
                    value={form.teacherId}
                    onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}
                    error={errors.teacherId}
                    hint="Agar teacher us waqt busy hai to save nahi hoga"
                >
                    <option value="">No teacher</option>
                    {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.user?.name} ({t.employeeNo})
                        </option>
                    ))}
                </SelectField>

                <TextField
                    label="Room"
                    name="roomNo"
                    value={form.roomNo}
                    onChange={(e) => setForm((f) => ({ ...f, roomNo: e.target.value }))}
                    error={errors.roomNo}
                />

                <button type="submit" className="hidden" />
            </form>
        </Modal>
    );
}
