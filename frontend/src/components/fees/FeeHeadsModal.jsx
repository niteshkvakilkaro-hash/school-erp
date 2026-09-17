import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TextField, SelectField } from '@/components/ui/field';
import { formatCurrency, titleCase } from '@/lib/utils';

const FREQUENCY = ['one-time', 'monthly', 'quarterly', 'half-yearly', 'annual'];

const BLANK = {
    name: '',
    code: '',
    amount: '',
    frequency: 'annual',
    classId: '',
    isOptional: false,
    description: '',
    status: 'active',
};

/** Fee heads ka master - Tuition, Transport waghairah. */
export function FeeHeadsModal({ open, onOpenChange, onChanged }) {
    const { can } = useAuth();
    const canManage = can('fees.manage');

    const [items, setItems] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);

    const [editing, setEditing] = useState(null);
    const [adding, setAdding] = useState(false);
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);

    const load = useCallback(() => {
        setLoading(true);
        api.get('/fees/heads')
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
        api.get('/classes/options').then(({ data }) => setClasses(data.data)).catch(() => {});
    }, [open, load]);

    const openForm = (head) => {
        setEditing(head);
        setAdding(true);
        setErrors({});
        setForm(
            head
                ? {
                      name: head.name,
                      code: head.code,
                      amount: head.amount,
                      frequency: head.frequency,
                      classId: head.classId || '',
                      isOptional: head.isOptional,
                      description: head.description || '',
                      status: head.status,
                  }
                : BLANK
        );
    };

    const set = (k) => (e) =>
        setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            const payload = { ...form, classId: form.classId || null };
            if (editing) {
                await api.put('/fees/heads/' + editing.id, payload);
                toast.success('Fee head update ho gaya');
            } else {
                await api.post('/fees/heads', payload);
                toast.success('Fee head ban gaya');
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
            await api.delete('/fees/heads/' + deleting.id);
            toast.success('Fee head delete ho gaya');
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
                title="Fee heads"
                description="Tuition, transport waghairah - inhi ko students par lagaya jata hai"
                size="lg"
            >
                <div className="space-y-4">
                    {canManage ? (
                        <div className="flex justify-end">
                            <Button
                                size="sm"
                                variant={adding ? 'outline' : 'default'}
                                onClick={() => (adding ? setAdding(false) : openForm(null))}
                            >
                                <Plus /> {adding ? 'Cancel' : 'Add fee head'}
                            </Button>
                        </div>
                    ) : null}

                    {adding ? (
                        <form
                            onSubmit={submit}
                            className="grid gap-3 rounded-xl border border-border bg-muted/40 p-4 sm:grid-cols-3"
                        >
                            <TextField
                                label="Name"
                                name="name"
                                required
                                className="sm:col-span-2"
                                placeholder="Tuition Fee"
                                value={form.name}
                                onChange={set('name')}
                                error={errors.name}
                            />
                            <TextField
                                label="Code"
                                name="code"
                                required
                                placeholder="TUITION"
                                value={form.code}
                                onChange={set('code')}
                                error={errors.code}
                            />
                            <TextField
                                label="Amount"
                                name="amount"
                                type="number"
                                min="0"
                                required
                                value={form.amount}
                                onChange={set('amount')}
                                error={errors.amount}
                            />
                            <SelectField
                                label="Frequency"
                                name="frequency"
                                value={form.frequency}
                                onChange={set('frequency')}
                            >
                                {FREQUENCY.map((f) => (
                                    <option key={f} value={f}>
                                        {titleCase(f.replace('-', ' '))}
                                    </option>
                                ))}
                            </SelectField>
                            <SelectField
                                label="Class"
                                name="classId"
                                value={form.classId}
                                onChange={set('classId')}
                                hint="Khaali = saari classes"
                            >
                                <option value="">All classes</option>
                                {classes.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </SelectField>
                            <TextField
                                label="Description"
                                name="description"
                                className="sm:col-span-2"
                                value={form.description}
                                onChange={set('description')}
                                error={errors.description}
                            />
                            <SelectField label="Status" name="status" value={form.status} onChange={set('status')}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </SelectField>
                            <label className="flex items-center gap-2.5 text-sm text-foreground sm:col-span-3">
                                <input
                                    type="checkbox"
                                    checked={form.isOptional}
                                    onChange={set('isOptional')}
                                    className="h-4 w-4 rounded border-input accent-[var(--primary)]"
                                />
                                Optional fee (transport jaisi - har student par apne aap nahi lagti)
                            </label>
                            <div className="sm:col-span-3">
                                <Button type="submit" size="sm" disabled={saving}>
                                    {saving ? 'Saving...' : editing ? 'Save changes' : 'Add fee head'}
                                </Button>
                            </div>
                        </form>
                    ) : null}

                    <TableWrap>
                        <Table>
                            <THead>
                                <TR>
                                    <TH>Fee head</TH>
                                    <TH className="text-right">Amount</TH>
                                    <TH>Frequency</TH>
                                    <TH>Class</TH>
                                    <TH>Students</TH>
                                    {canManage ? <TH className="text-right">Actions</TH> : null}
                                </TR>
                            </THead>
                            <TBody>
                                {loading ? (
                                    <EmptyRow colSpan={canManage ? 6 : 5}>Load ho raha hai...</EmptyRow>
                                ) : items.length === 0 ? (
                                    <EmptyRow colSpan={canManage ? 6 : 5}>Abhi koi fee head nahi</EmptyRow>
                                ) : (
                                    items.map((h) => (
                                        <TR key={h.id}>
                                            <TD>
                                                <p className="font-medium text-foreground">{h.name}</p>
                                                <p className="font-mono text-xs text-muted-foreground">
                                                    {h.code}
                                                    {h.isOptional ? ' - optional' : ''}
                                                </p>
                                            </TD>
                                            <TD className="text-right font-medium">{formatCurrency(h.amount)}</TD>
                                            <TD>
                                                <Badge variant="outline" className="capitalize">
                                                    {h.frequency.replace('-', ' ')}
                                                </Badge>
                                            </TD>
                                            <TD>
                                                {h.schoolClass ? (
                                                    <Badge variant="secondary">{h.schoolClass.name}</Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">All</span>
                                                )}
                                            </TD>
                                            <TD>{h.assignedCount}</TD>
                                            {canManage ? (
                                                <TD>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            title="Edit"
                                                            onClick={() => openForm(h)}
                                                        >
                                                            <Pencil />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            title="Delete"
                                                            className="text-destructive hover:bg-destructive/10"
                                                            onClick={() => setDeleting(h)}
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
                message="Jo fee head students par laga hua hai wo delete nahi hoga - use inactive kar dijiye."
                onConfirm={confirmDelete}
            />
        </>
    );
}
