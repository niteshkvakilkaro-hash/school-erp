import { useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';

export function ChangePasswordModal({ open, onOpenChange }) {
    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const close = () => {
        setForm({ currentPassword: '', newPassword: '', confirm: '' });
        setErrors({});
        onOpenChange(false);
    };

    const submit = async (e) => {
        e.preventDefault();
        if (form.newPassword !== form.confirm) {
            setErrors({ confirm: 'Dono password same hone chahiye' });
            return;
        }

        setSaving(true);
        try {
            await api.post('/auth/change-password', {
                currentPassword: form.currentPassword,
                newPassword: form.newPassword,
            });
            toast.success('Password update ho gaya');
            close();
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
            onOpenChange={(v) => (v ? onOpenChange(true) : close())}
            title="Change password"
            size="sm"
            footer={
                <>
                    <Button variant="outline" onClick={close} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={saving}>
                        {saving ? 'Saving...' : 'Update password'}
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} className="space-y-4">
                <TextField
                    label="Current password"
                    name="currentPassword"
                    type="password"
                    required
                    value={form.currentPassword}
                    onChange={set('currentPassword')}
                    error={errors.currentPassword}
                />
                <TextField
                    label="New password"
                    name="newPassword"
                    type="password"
                    required
                    value={form.newPassword}
                    onChange={set('newPassword')}
                    error={errors.newPassword}
                    hint="Kam se kam 6 character"
                />
                <TextField
                    label="Confirm new password"
                    name="confirm"
                    type="password"
                    required
                    value={form.confirm}
                    onChange={set('confirm')}
                    error={errors.confirm}
                />
                <button type="submit" className="hidden" />
            </form>
        </Modal>
    );
}
