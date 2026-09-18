import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { TextField, SelectField } from '@/components/ui/field';

const BLANK = { name: '', code: '', vehicleId: '', monthlyFare: 0, description: '', status: 'active' };

/**
 * route: null = band, {} = naya, route object = edit.
 * vehicles list parent se aati hai - jo vehicle kisi aur route par hai wo disabled.
 */
export function RouteModal({ route, vehicles, onClose, onSaved }) {
    const isEdit = Boolean(route?.id);
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!route) return;
        setErrors({});
        setForm(
            isEdit
                ? { ...BLANK, ...Object.fromEntries(Object.keys(BLANK).map((k) => [k, route[k] ?? ''])) }
                : BLANK
        );
    }, [route, isEdit]);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e?.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            const payload = {
                ...form,
                vehicleId: form.vehicleId || null,
                description: form.description || undefined,
            };
            if (isEdit) {
                await api.put('/transport/routes/' + route.id, payload);
                toast.success('Route update ho gaya');
            } else {
                await api.post('/transport/routes', payload);
                toast.success('Route ban gaya - ab stops add kijiye');
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
            open={Boolean(route)}
            onOpenChange={(v) => !v && onClose()}
            title={isEdit ? 'Edit route' : 'New route'}
            description={isEdit && route.riders ? route.riders + ' students is route par hain' : undefined}
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
                <TextField label="Route name" name="name" required className="sm:col-span-2" placeholder="Civil Lines - Station Road" value={form.name} onChange={set('name')} error={errors.name} />
                <TextField label="Code" name="code" required placeholder="R5" value={form.code} onChange={set('code')} error={errors.code} />
                <TextField label="Monthly fare" name="monthlyFare" type="number" min="0" value={form.monthlyFare} onChange={set('monthlyFare')} error={errors.monthlyFare} />
                <SelectField label="Vehicle" name="vehicleId" className="sm:col-span-2" value={form.vehicleId} onChange={set('vehicleId')} error={errors.vehicleId}>
                    <option value="">Abhi koi nahi</option>
                    {vehicles.map((v) => {
                        const busy = v.route && v.route.id !== route?.id;
                        const current = route?.vehicleId === v.id;
                        return (
                            <option key={v.id} value={v.id} disabled={busy || (v.status !== 'active' && !current)}>
                                {v.regNo} - {v.capacity} seats
                                {busy ? ' (route ' + v.route.code + ')' : v.status !== 'active' ? ' (' + v.status + ')' : ''}
                            </option>
                        );
                    })}
                </SelectField>
                <TextField label="Description" name="description" className="sm:col-span-2" value={form.description} onChange={set('description')} error={errors.description} />
                <SelectField label="Status" name="status" value={form.status} onChange={set('status')}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </SelectField>
                <button type="submit" className="hidden" />
            </form>
        </Modal>
    );
}
