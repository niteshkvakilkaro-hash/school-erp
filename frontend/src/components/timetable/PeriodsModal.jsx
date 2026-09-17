import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Coffee } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TextField } from '@/components/ui/field';

const BLANK = { name: '', startTime: '09:00', endTime: '09:45', sortOrder: 1, isBreak: false };

/** School ka bell schedule - ek hi baar set hota hai, saari classes par lagta hai. */
export function PeriodsModal({ open, onOpenChange, onChanged }) {
    const { can } = useAuth();
    const canManage = can('timetable.manage');

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);

    const load = useCallback(() => {
        setLoading(true);
        api.get('/timetable/periods')
            .then(({ data }) => setItems(data.data))
            .catch((err) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!open) {
            setAdding(false);
            setEditing(null);
            return;
        }
        load();
    }, [open, load]);

    const openForm = (p) => {
        setEditing(p);
        setAdding(true);
        setErrors({});
        setForm(
            p
                ? {
                      name: p.name,
                      startTime: p.startTime,
                      endTime: p.endTime,
                      sortOrder: p.sortOrder,
                      isBreak: p.isBreak,
                  }
                : { ...BLANK, sortOrder: items.length + 1 }
        );
    };

    const set = (k) => (e) =>
        setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            if (editing) {
                await api.put('/timetable/periods/' + editing.id, form);
                toast.success('Period update ho gaya');
            } else {
                await api.post('/timetable/periods', form);
                toast.success('Period ban gaya');
            }
            setAdding(false);
            setEditing(null);
            load();
            onChanged?.();
        } catch (err) {
            setErrors(err.fieldErrors || {});
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        try {
            await api.delete('/timetable/periods/' + deleting.id);
            toast.success('Period delete ho gaya');
            setDeleting(null);
            load();
            onChanged?.();
        } catch (err) {
            toast.error(err.message);
        }
    };

    return (
        <>
            <Modal
                open={open}
                onOpenChange={onOpenChange}
                title="Periods"
                description="School ka bell schedule - saari classes par yahi lagta hai"
                size="md"
            >
                <div className="space-y-4">
                    {canManage ? (
                        <div className="flex justify-end">
                            <Button
                                size="sm"
                                variant={adding ? 'outline' : 'default'}
                                onClick={() => (adding ? setAdding(false) : openForm(null))}
                            >
                                <Plus /> {adding ? 'Cancel' : 'Add period'}
                            </Button>
                        </div>
                    ) : null}

                    {adding ? (
                        <form
                            onSubmit={submit}
                            className="grid gap-3 rounded-xl border border-border bg-muted/40 p-4 sm:grid-cols-2"
                        >
                            <TextField
                                label="Name"
                                name="name"
                                required
                                placeholder="Period 1"
                                value={form.name}
                                onChange={set('name')}
                                error={errors.name}
                            />
                            <TextField
                                label="Order"
                                name="sortOrder"
                                type="number"
                                min="0"
                                value={form.sortOrder}
                                onChange={set('sortOrder')}
                                error={errors.sortOrder}
                                hint="Din me kaunse number par"
                            />
                            <TextField
                                label="Start time"
                                name="startTime"
                                type="time"
                                required
                                value={form.startTime}
                                onChange={set('startTime')}
                                error={errors.startTime}
                            />
                            <TextField
                                label="End time"
                                name="endTime"
                                type="time"
                                required
                                value={form.endTime}
                                onChange={set('endTime')}
                                error={errors.endTime}
                            />
                            <label className="flex items-center gap-2.5 text-sm text-foreground sm:col-span-2">
                                <input
                                    type="checkbox"
                                    checked={form.isBreak}
                                    onChange={set('isBreak')}
                                    className="h-4 w-4 rounded border-input accent-[var(--primary)]"
                                />
                                Ye break hai (lunch/recess - isme class nahi lagti)
                            </label>
                            <div className="sm:col-span-2">
                                <Button type="submit" size="sm" disabled={saving}>
                                    {saving ? 'Saving...' : editing ? 'Save changes' : 'Add period'}
                                </Button>
                            </div>
                        </form>
                    ) : null}

                    <TableWrap>
                        <Table>
                            <THead>
                                <TR>
                                    <TH className="w-12">#</TH>
                                    <TH>Period</TH>
                                    <TH>Time</TH>
                                    {canManage ? <TH className="text-right">Actions</TH> : null}
                                </TR>
                            </THead>
                            <TBody>
                                {loading ? (
                                    <EmptyRow colSpan={canManage ? 4 : 3}>Load ho raha hai...</EmptyRow>
                                ) : items.length === 0 ? (
                                    <EmptyRow colSpan={canManage ? 4 : 3}>
                                        Abhi koi period nahi - pehla period banaiye
                                    </EmptyRow>
                                ) : (
                                    items.map((p) => (
                                        <TR key={p.id} className={p.isBreak ? 'bg-muted/40' : undefined}>
                                            <TD className="text-muted-foreground">{p.sortOrder}</TD>
                                            <TD>
                                                <span className="flex items-center gap-2 font-medium text-foreground">
                                                    {p.isBreak ? (
                                                        <Coffee className="h-3.5 w-3.5 text-muted-foreground" />
                                                    ) : null}
                                                    {p.name}
                                                </span>
                                                {p.isBreak ? (
                                                    <Badge variant="muted" className="mt-1">
                                                        Break
                                                    </Badge>
                                                ) : null}
                                            </TD>
                                            <TD className="font-mono text-xs text-muted-foreground">
                                                {p.startTime} - {p.endTime}
                                            </TD>
                                            {canManage ? (
                                                <TD>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            title="Edit"
                                                            onClick={() => openForm(p)}
                                                        >
                                                            <Pencil />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            title="Delete"
                                                            className="text-destructive hover:bg-destructive/10"
                                                            onClick={() => setDeleting(p)}
                                                        >
                                                            <Trash2 />
                                                        </Button>
                                                    </div>
                                                </TD>
                                            ) : null}
                                        </TR>
                                    ))
                                )}
                            </TBody>
                        </Table>
                    </TableWrap>
                </div>
            </Modal>

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={'Delete ' + (deleting?.name || '') + '?'}
                message="Jis period me classes lagi hui hain wo delete nahi hoga."
                onConfirm={confirmDelete}
            />
        </>
    );
}
