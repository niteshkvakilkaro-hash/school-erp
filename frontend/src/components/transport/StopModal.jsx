import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';

const BLANK = { name: '', pickupTime: '', dropTime: '', sortOrder: 1 };

/** target: null = band, { route } = naya stop, { route, stop } = edit */
export function StopModal({ target, onClose, onSaved }) {
    const stop = target?.stop;
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!target) return;
        setErrors({});
        setForm(
            stop
                ? { name: stop.name, pickupTime: stop.pickupTime || '', dropTime: stop.dropTime || '', sortOrder: stop.sortOrder }
                : { ...BLANK, sortOrder: (target.route.stops?.length || 0) + 1 }
        );
    }, [target, stop]);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e?.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            if (stop) {
                await api.put('/transport/stops/' + stop.id, form);
                toast.success('Stop update ho gaya');
            } else {
                await api.post('/transport/routes/' + target.route.id + '/stops', form);
                toast.success('Stop add ho gaya');
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
            open={Boolean(target)}
            onOpenChange={(v) => !v && onClose()}
            title={stop ? 'Edit stop' : 'Add stop'}
            description={target ? target.route.code + ' - ' + target.route.name : undefined}
            size="sm"
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
                <TextField label="Stop name" name="name" required className="sm:col-span-2" value={form.name} onChange={set('name')} error={errors.name} />
                <TextField label="Pickup (subah)" name="pickupTime" type="time" value={form.pickupTime} onChange={set('pickupTime')} error={errors.pickupTime} />
                <TextField label="Drop (chhutti)" name="dropTime" type="time" value={form.dropTime} onChange={set('dropTime')} error={errors.dropTime} />
                <TextField label="Order" name="sortOrder" type="number" min="0" value={form.sortOrder} onChange={set('sortOrder')} error={errors.sortOrder} hint="Route par kaunsa number" />
                <button type="submit" className="hidden" />
            </form>
        </Modal>
    );
}
