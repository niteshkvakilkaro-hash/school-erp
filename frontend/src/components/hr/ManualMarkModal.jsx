import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { SelectField, TextField } from '@/components/ui/field';

export const STATUS_LABEL = { present: 'Present', late: 'Late', 'half-day': 'Half day', absent: 'Absent', leave: 'Leave' };

/** target: null = band, { user, date, status? } = us din ka status haath se. */
export function ManualMarkModal({ target, onClose, onSaved }) {
    const [status, setStatus] = useState('present');
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!target) return;
        setStatus(target.status && STATUS_LABEL[target.status] ? target.status : 'present');
        setNote('');
        setErrors({});
    }, [target]);

    const submit = async (e) => {
        e?.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            const { data } = await api.post('/hr/attendance/manual', { userId: target.user.id, date: target.date, status, note });
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
            open={Boolean(target)}
            onOpenChange={(v) => !v && onClose()}
            title="Attendance badliye"
            description={target ? target.user.name + ' - ' + target.date : undefined}
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
            <form onSubmit={submit} className="space-y-4">
                <SelectField label="Status" name="status" value={status} onChange={(e) => setStatus(e.target.value)} error={errors.status}>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </SelectField>
                <TextField
                    label="Kyun badla"
                    name="note"
                    required
                    placeholder="e.g. Phone kharab tha, register me sign kiya"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    error={errors.note}
                    hint="Record me rahega - baad me audit ke liye"
                />
                <p className="text-xs text-muted-foreground">Check-in ka time, selfie aur location jaise the waise rahenge - sirf status badlega.</p>
                <button type="submit" className="hidden" />
            </form>
        </Modal>
    );
}
