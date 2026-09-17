import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow, LoadingRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { TextField, SelectField, TextareaField } from '@/components/ui/field';
import { formatCurrency } from '@/lib/utils';

const BLANK = {
    name: '',
    code: '',
    pricePerMonth: 0,
    maxStudents: 0,
    maxTeachers: 0,
    features: '',
    status: 'active',
};

const limitText = (v) => (Number(v) === 0 ? 'Unlimited' : v);

export default function Plans() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        api.get('/platform/plans')
            .then(({ data }) => setItems(data.data))
            .catch((err) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const openForm = (plan) => {
        setEditing(plan);
        setErrors({});
        setForm(plan ? { ...BLANK, ...plan, features: plan.features || '' } : BLANK);
        setFormOpen(true);
    };

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            if (editing) {
                await api.put('/platform/plans/' + editing.id, form);
                toast.success('Plan update ho gaya');
            } else {
                await api.post('/platform/plans', form);
                toast.success('Plan ban gaya');
            }
            setFormOpen(false);
            load();
        } catch (err) {
            setErrors(err.fieldErrors || {});
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        setDeleteBusy(true);
        try {
            await api.delete('/platform/plans/' + deleting.id);
            toast.success('Plan delete ho gaya');
            setDeleting(null);
            load();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setDeleteBusy(false);
        }
    };

    return (
        <div>
            <PageHeader
                title="Plans"
                subtitle="SaaS pricing - schools inhi plans par subscribe karte hain"
                actions={
                    <Button onClick={() => openForm(null)}>
                        <Plus /> Add plan
                    </Button>
                }
            />

            <TableWrap>
                <Table>
                    <THead>
                        <TR>
                            <TH>Plan</TH>
                            <TH>Code</TH>
                            <TH>Price / month</TH>
                            <TH>Max students</TH>
                            <TH>Max teachers</TH>
                            <TH>Status</TH>
                            <TH className="text-right">Actions</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <LoadingRow colSpan={7} />
                        ) : items.length === 0 ? (
                            <EmptyRow colSpan={7}>Abhi koi plan nahi</EmptyRow>
                        ) : (
                            items.map((p) => (
                                <TR key={p.id}>
                                    <TD>
                                        <p className="font-medium text-foreground">{p.name}</p>
                                        {p.features ? (
                                            <p className="max-w-sm text-xs text-muted-foreground">{p.features}</p>
                                        ) : null}
                                    </TD>
                                    <TD className="font-mono text-xs">{p.code}</TD>
                                    <TD className="font-medium">{formatCurrency(p.pricePerMonth)}</TD>
                                    <TD>{limitText(p.maxStudents)}</TD>
                                    <TD>{limitText(p.maxTeachers)}</TD>
                                    <TD>
                                        <Badge
                                            variant={p.status === 'active' ? 'success' : 'muted'}
                                            className="capitalize"
                                        >
                                            {p.status}
                                        </Badge>
                                    </TD>
                                    <TD>
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon-sm" title="Edit" onClick={() => openForm(p)}>
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
                                </TR>
                            ))
                        )}
                    </TBody>
                </Table>
            </TableWrap>

            <Modal
                open={formOpen}
                onOpenChange={setFormOpen}
                title={editing ? 'Edit plan' : 'Add plan'}
                size="md"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={submit} disabled={saving}>
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                    <TextField
                        label="Plan name"
                        name="name"
                        required
                        value={form.name}
                        onChange={set('name')}
                        error={errors.name}
                    />
                    <TextField
                        label="Code"
                        name="code"
                        required
                        placeholder="GROWTH"
                        value={form.code}
                        onChange={set('code')}
                        error={errors.code}
                    />
                    <TextField
                        label="Price per month"
                        name="pricePerMonth"
                        type="number"
                        min="0"
                        value={form.pricePerMonth}
                        onChange={set('pricePerMonth')}
                        error={errors.pricePerMonth}
                    />
                    <SelectField label="Status" name="status" value={form.status} onChange={set('status')}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </SelectField>
                    <TextField
                        label="Max students"
                        name="maxStudents"
                        type="number"
                        min="0"
                        value={form.maxStudents}
                        onChange={set('maxStudents')}
                        error={errors.maxStudents}
                        hint="0 = unlimited"
                    />
                    <TextField
                        label="Max teachers"
                        name="maxTeachers"
                        type="number"
                        min="0"
                        value={form.maxTeachers}
                        onChange={set('maxTeachers')}
                        error={errors.maxTeachers}
                        hint="0 = unlimited"
                    />
                    <TextareaField
                        label="Features"
                        name="features"
                        className="sm:col-span-2"
                        rows={2}
                        value={form.features}
                        onChange={set('features')}
                        error={errors.features}
                    />
                    <button type="submit" className="hidden" />
                </form>
            </Modal>

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={'Delete ' + (deleting?.name || '') + '?'}
                message="Jis plan par active schools hain wo delete nahi hoga."
                loading={deleteBusy}
                onConfirm={confirmDelete}
            />
        </div>
    );
}
