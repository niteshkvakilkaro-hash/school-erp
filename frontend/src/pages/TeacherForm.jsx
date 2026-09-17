import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { TextField, SelectField, TextareaField } from '@/components/ui/field';
import { toDateInput } from '@/lib/utils';

const BLANK = {
    name: '',
    email: '',
    password: '',
    phone: '',
    employeeNo: '',
    gender: '',
    dob: '',
    qualification: '',
    specialization: '',
    experienceYears: 0,
    joiningDate: '',
    salary: '',
    address: '',
    city: '',
    status: 'active',
};

export function TeacherForm({ open, onOpenChange, teacher, onSaved }) {
    const isEdit = Boolean(teacher);
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setErrors({});

        if (teacher) {
            setForm({
                ...BLANK,
                ...teacher,
                name: teacher.user?.name || '',
                email: teacher.user?.email || '',
                phone: teacher.user?.phone || '',
                password: '',
                gender: teacher.gender || '',
                qualification: teacher.qualification || '',
                specialization: teacher.specialization || '',
                experienceYears: teacher.experienceYears ?? 0,
                salary: teacher.salary || '',
                address: teacher.address || '',
                city: teacher.city || '',
                dob: toDateInput(teacher.dob),
                joiningDate: toDateInput(teacher.joiningDate),
            });
        } else {
            setForm({ ...BLANK, joiningDate: toDateInput(new Date()) });
        }
    }, [open, teacher]);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            const payload = { ...form };
            // Edit par blank password ka matlab "change mat karo"
            if (isEdit && !payload.password) delete payload.password;

            if (isEdit) {
                await api.put('/teachers/' + teacher.id, payload);
                toast.success('Teacher update ho gaya');
            } else {
                await api.post('/teachers', payload);
                toast.success('Teacher add ho gaya');
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
            title={isEdit ? 'Edit teacher' : 'Add teacher'}
            description={isEdit ? teacher.employeeNo : 'Teacher ka login account bhi isi form se banega'}
            size="lg"
            footer={
                <>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={saving}>
                        {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add teacher'}
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} className="space-y-6">
                <section className="space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Login account
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                            label="Full name"
                            name="name"
                            required
                            value={form.name}
                            onChange={set('name')}
                            error={errors.name}
                        />
                        <TextField
                            label="Email"
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
                            required={!isEdit}
                            value={form.password}
                            onChange={set('password')}
                            error={errors.password}
                            hint={isEdit ? 'Khaali chhodenge to password change nahi hoga' : 'Kam se kam 6 character'}
                        />
                        <TextField
                            label="Phone"
                            name="phone"
                            value={form.phone}
                            onChange={set('phone')}
                            error={errors.phone}
                        />
                    </div>
                </section>

                <section className="space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Employment details
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <TextField
                            label="Employee No"
                            name="employeeNo"
                            required
                            value={form.employeeNo}
                            onChange={set('employeeNo')}
                            error={errors.employeeNo}
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
                        <TextField
                            label="Qualification"
                            name="qualification"
                            placeholder="M.Sc, B.Ed"
                            value={form.qualification}
                            onChange={set('qualification')}
                            error={errors.qualification}
                        />
                        <TextField
                            label="Specialization"
                            name="specialization"
                            placeholder="Mathematics"
                            value={form.specialization}
                            onChange={set('specialization')}
                            error={errors.specialization}
                        />
                        <TextField
                            label="Experience (years)"
                            name="experienceYears"
                            type="number"
                            min="0"
                            value={form.experienceYears}
                            onChange={set('experienceYears')}
                            error={errors.experienceYears}
                        />
                        <TextField
                            label="Joining date"
                            name="joiningDate"
                            type="date"
                            value={form.joiningDate}
                            onChange={set('joiningDate')}
                            error={errors.joiningDate}
                        />
                        <TextField
                            label="Salary (monthly)"
                            name="salary"
                            type="number"
                            min="0"
                            value={form.salary}
                            onChange={set('salary')}
                            error={errors.salary}
                        />
                        <SelectField
                            label="Status"
                            name="status"
                            value={form.status}
                            onChange={set('status')}
                            hint="Inactive karne par login band ho jayega"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </SelectField>
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

                <button type="submit" className="hidden" />
            </form>
        </Modal>
    );
}
