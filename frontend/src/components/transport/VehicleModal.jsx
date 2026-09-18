import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { TextField, SelectField } from '@/components/ui/field';

const BLANK = {
    regNo: '',
    type: 'bus',
    capacity: 40,
    driverName: '',
    driverPhone: '',
    helperName: '',
    helperPhone: '',
    insuranceExpiry: '',
    status: 'active',
};

/** vehicle: null = band, {} = naya, vehicle object = edit */
export function VehicleModal({ vehicle, onClose, onSaved }) {
    const isEdit = Boolean(vehicle?.id);
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!vehicle) return;
        setErrors({});
        setForm(
            isEdit
                ? { ...BLANK, ...Object.fromEntries(Object.keys(BLANK).map((k) => [k, vehicle[k] ?? ''])) }
                : BLANK
        );
    }, [vehicle, isEdit]);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e?.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            const payload = {
                ...form,
                driverName: form.driverName || undefined,
                driverPhone: form.driverPhone || undefined,
                helperName: form.helperName || undefined,
                helperPhone: form.helperPhone || undefined,
                insuranceExpiry: form.insuranceExpiry || null,
            };
            if (isEdit) {
                await api.put('/transport/vehicles/' + vehicle.id, payload);
                toast.success('Vehicle update ho gaya');
            } else {
                await api.post('/transport/vehicles', payload);
                toast.success('Vehicle add ho gaya');
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
            open={Boolean(vehicle)}
            onOpenChange={(v) => !v && onClose()}
            title={isEdit ? 'Edit vehicle' : 'Add vehicle'}
            size="md"
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={saving}>
                        {saving ? 'Saving...' : 'Save'}
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                <TextField label="Registration no" name="regNo" required placeholder="MP-09-P-1234" value={form.regNo} onChange={set('regNo')} error={errors.regNo} />
                <SelectField label="Type" name="type" value={form.type} onChange={set('type')}>
                    <option value="bus">Bus</option>
                    <option value="mini-bus">Mini bus</option>
                    <option value="van">Van</option>
                    <option value="auto">Auto</option>
                </SelectField>
                <TextField label="Seats" name="capacity" type="number" min="1" max="100" required value={form.capacity} onChange={set('capacity')} error={errors.capacity} />
                <TextField label="Insurance expiry" name="insuranceExpiry" type="date" value={form.insuranceExpiry} onChange={set('insuranceExpiry')} error={errors.insuranceExpiry} />
                <TextField label="Driver" name="driverName" value={form.driverName} onChange={set('driverName')} error={errors.driverName} />
                <TextField label="Driver phone" name="driverPhone" value={form.driverPhone} onChange={set('driverPhone')} error={errors.driverPhone} />
                <TextField label="Helper / attendant" name="helperName" value={form.helperName} onChange={set('helperName')} error={errors.helperName} />
                <TextField label="Helper phone" name="helperPhone" value={form.helperPhone} onChange={set('helperPhone')} error={errors.helperPhone} />
                <SelectField label="Status" name="status" value={form.status} onChange={set('status')}>
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inactive">Inactive</option>
                </SelectField>
                <button type="submit" className="hidden" />
            </form>
        </Modal>
    );
}
