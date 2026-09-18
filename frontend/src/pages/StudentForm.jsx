import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { TextField, SelectField, TextareaField } from '@/components/ui/field';
import { toDateInput } from '@/lib/utils';

const BLANK = {
    admissionNo: '',
    firstName: '',
    lastName: '',
    gender: '',
    dob: '',
    bloodGroup: '',
    classId: '',
    sectionId: '',
    rollNo: '',
    fatherName: '',
    motherName: '',
    guardianPhone: '',
    guardianEmail: '',
    address: '',
    city: '',
    admissionDate: '',
    status: 'active',
    createLogin: false,
    email: '',
    password: '',
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export function StudentForm({ open, onOpenChange, student, classes, onSaved }) {
    const isEdit = Boolean(student);
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    // Class badalne par sirf usi class ke sections dikhne chahiye
    const sections = useMemo(() => {
        const cls = classes.find((c) => String(c.id) === String(form.classId));
        return cls?.sections || [];
    }, [classes, form.classId]);

    useEffect(() => {
        if (!open) return;
        setErrors({});

        if (student) {
            setForm({
                ...BLANK,
                ...student,
                lastName: student.lastName || '',
                gender: student.gender || '',
                bloodGroup: student.bloodGroup || '',
                classId: student.classId || '',
                sectionId: student.sectionId || '',
                rollNo: student.rollNo || '',
                fatherName: student.fatherName || '',
                motherName: student.motherName || '',
                guardianPhone: student.guardianPhone || '',
                guardianEmail: student.guardianEmail || '',
                address: student.address || '',
                city: student.city || '',
                dob: toDateInput(student.dob),
                admissionDate: toDateInput(student.admissionDate),
                email: student.user?.email || '',
                password: '',
                createLogin: Boolean(student.user),
            });
        } else {
            // Naye admission par agla admission number pre-fill kar dete hain
            setForm({ ...BLANK, admissionDate: toDateInput(new Date()) });
            api.get('/students/next-admission-no')
                .then(({ data }) => setForm((f) => ({ ...f, admissionNo: data.data.admissionNo })))
                .catch(() => {});
        }
    }, [open, student]);

    const set = (k) => (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm((f) => {
            // Class badli to purana section clear - warna backend mismatch error dega
            if (k === 'classId') return { ...f, classId: value, sectionId: '' };
            return { ...f, [k]: value };
        });
    };

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            const payload = { ...form };
            if (!payload.createLogin) {
                delete payload.email;
                delete payload.password;
            }
            if (isEdit && !payload.password) delete payload.password;

            if (isEdit) {
                const { data } = await api.put('/students/' + student.id, payload);
                toast.success(data.message.includes('transport') ? 'Student update ho gaya - bus ki seat bhi khali kar di' : 'Student update ho gaya');
            } else {
                await api.post('/students', payload);
                toast.success('Admission ho gaya');
            }
            onSaved();
            onOpenChange(false);
        } catch (err) {
            setErrors(err.fieldErrors || {});
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Edit student' : 'New admission'}
            description={isEdit ? student.admissionNo : 'Student ki details bhariye'}
            size="lg"
            footer={
                <>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={saving}>
                        {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Admit student'}
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} className="space-y-6">
                <section className="space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Basic details
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <TextField
                            label="Admission No"
                            name="admissionNo"
                            required
                            value={form.admissionNo}
                            onChange={set('admissionNo')}
                            error={errors.admissionNo}
                        />
                        <TextField
                            label="First name"
                            name="firstName"
                            required
                            value={form.firstName}
                            onChange={set('firstName')}
                            error={errors.firstName}
                        />
                        <TextField
                            label="Last name"
                            name="lastName"
                            value={form.lastName}
                            onChange={set('lastName')}
                            error={errors.lastName}
                        />
                        <SelectField
                            label="Gender"
                            name="gender"
                            value={form.gender}
                            onChange={set('gender')}
                            error={errors.gender}
                        >
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </SelectField>
                        <TextField
                            label="Date of birth"
                            name="dob"
                            type="date"
                            value={form.dob}
                            onChange={set('dob')}
                            error={errors.dob}
                        />
                        <SelectField
                            label="Blood group"
                            name="bloodGroup"
                            value={form.bloodGroup}
                            onChange={set('bloodGroup')}
                        >
                            <option value="">Select</option>
                            {BLOOD_GROUPS.map((b) => (
                                <option key={b} value={b}>
                                    {b}
                                </option>
                            ))}
                        </SelectField>
                    </div>
                </section>

                <section className="space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Class allotment
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <SelectField
                            label="Class"
                            name="classId"
                            value={form.classId}
                            onChange={set('classId')}
                            error={errors.classId}
                        >
                            <option value="">Select class</option>
                            {classes.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </SelectField>
                        <SelectField
                            label="Section"
                            name="sectionId"
                            value={form.sectionId}
                            onChange={set('sectionId')}
                            error={errors.sectionId}
                            disabled={!form.classId}
                            hint={!form.classId ? 'Pehle class chuniye' : undefined}
                        >
                            <option value="">Select section</option>
                            {sections.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </SelectField>
                        <TextField
                            label="Roll No"
                            name="rollNo"
                            value={form.rollNo}
                            onChange={set('rollNo')}
                            error={errors.rollNo}
                        />
                        <SelectField
                            label="Status"
                            name="status"
                            value={form.status}
                            onChange={set('status')}
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="alumni">Alumni</option>
                        </SelectField>
                        <TextField
                            label="Admission date"
                            name="admissionDate"
                            type="date"
                            value={form.admissionDate}
                            onChange={set('admissionDate')}
                            error={errors.admissionDate}
                        />
                    </div>
                </section>

                <section className="space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Guardian &amp; contact
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <TextField
                            label="Father name"
                            name="fatherName"
                            value={form.fatherName}
                            onChange={set('fatherName')}
                            error={errors.fatherName}
                        />
                        <TextField
                            label="Mother name"
                            name="motherName"
                            value={form.motherName}
                            onChange={set('motherName')}
                            error={errors.motherName}
                        />
                        <TextField
                            label="Guardian phone"
                            name="guardianPhone"
                            value={form.guardianPhone}
                            onChange={set('guardianPhone')}
                            error={errors.guardianPhone}
                        />
                        <TextField
                            label="Guardian email"
                            name="guardianEmail"
                            type="email"
                            value={form.guardianEmail}
                            onChange={set('guardianEmail')}
                            error={errors.guardianEmail}
                        />
                        <TextField
                            label="City"
                            name="city"
                            value={form.city}
                            onChange={set('city')}
                            error={errors.city}
                        />
                    </div>
                    <TextareaField
                        label="Address"
                        name="address"
                        value={form.address}
                        onChange={set('address')}
                        error={errors.address}
                        rows={2}
                    />
                </section>

                <section className="space-y-4 rounded-lg border border-border bg-muted/40 p-4">
                    <label className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                        <input
                            type="checkbox"
                            checked={form.createLogin}
                            onChange={set('createLogin')}
                            disabled={isEdit && Boolean(student?.user)}
                            className="h-4 w-4 rounded border-input accent-[var(--primary)]"
                        />
                        Student portal login banaye
                    </label>

                    {form.createLogin ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <TextField
                                label="Login email"
                                name="email"
                                type="email"
                                required
                                value={form.email}
                                onChange={set('email')}
                                error={errors.email}
                            />
                            <TextField
                                label="Password"
                                name="password"
                                type="password"
                                value={form.password}
                                onChange={set('password')}
                                error={errors.password}
                                hint={
                                    isEdit && student?.user
                                        ? 'Khaali chhodenge to password change nahi hoga'
                                        : 'Kam se kam 6 character'
                                }
                            />
                        </div>
                    ) : null}
                </section>

                <button type="submit" className="hidden" />
            </form>
        </Modal>
    );
}
