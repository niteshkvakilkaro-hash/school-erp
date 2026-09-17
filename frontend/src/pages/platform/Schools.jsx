import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, LogIn } from 'lucide-react';
import api, { setActiveSchool } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow, LoadingRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { TextField, SelectField } from '@/components/ui/field';
import { SCHOOL_STATUS_VARIANT } from './PlatformDashboard';

const BLANK = {
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    website: '',
    session: '2026-27',
    status: 'trial',
    planId: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
};

export default function Schools() {
    const { can } = useAuth();
    const canManage = can('platform.schools.manage');

    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [status, setStatus] = useState('');
    const [plans, setPlans] = useState([]);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const search = useDebounce(searchInput, 400);

    useEffect(() => {
        api.get('/platform/plans').then(({ data }) => setPlans(data.data)).catch(() => {});
    }, []);

    const load = useCallback(() => {
        setLoading(true);
        const params = { page, limit: 10 };
        if (search) params.search = search;
        if (status) params.status = status;

        api.get('/platform/schools', { params })
            .then(({ data }) => {
                setItems(data.data.items);
                setMeta(data.data.meta);
            })
            .catch((err) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, [page, search, status]);

    useEffect(() => {
        load();
    }, [load]);

    const openForm = (school) => {
        setEditing(school);
        setErrors({});
        setForm(
            school
                ? {
                      ...BLANK,
                      ...school,
                      email: school.email || '',
                      phone: school.phone || '',
                      address: school.address || '',
                      city: school.city || '',
                      state: school.state || '',
                      pincode: school.pincode || '',
                      website: school.website || '',
                      session: school.session || '',
                  }
                : BLANK
        );
        setFormOpen(true);
    };

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            if (editing) {
                const { adminName, adminEmail, adminPassword, planId, ...payload } = form;
                await api.put('/platform/schools/' + editing.id, payload);
                toast.success('School update ho gaya');
            } else {
                await api.post('/platform/schools', { ...form, planId: form.planId || undefined });
                toast.success('School ban gaya');
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
            await api.delete('/platform/schools/' + deleting.id, { params: { confirm: deleting.code } });
            toast.success('School delete ho gaya');
            setDeleting(null);
            load();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setDeleteBusy(false);
        }
    };

    const enterSchool = (school) => {
        setActiveSchool(school.id);
        window.location.href = '/';
    };

    return (
        <div>
            <PageHeader
                title="Schools"
                subtitle={meta ? meta.total + ' schools platform par' : 'Loading...'}
                actions={
                    canManage ? (
                        <Button onClick={() => openForm(null)}>
                            <Plus /> Add school
                        </Button>
                    ) : null
                }
            />

            <Card className="mb-4">
                <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
                    <div className="relative sm:col-span-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="School name, code ya city se search"
                            className="pl-9"
                            value={searchInput}
                            onChange={(e) => {
                                setPage(1);
                                setSearchInput(e.target.value);
                            }}
                        />
                    </div>
                    <Select
                        value={status}
                        onChange={(e) => {
                            setPage(1);
                            setStatus(e.target.value);
                        }}
                    >
                        <option value="">All status</option>
                        <option value="active">Active</option>
                        <option value="trial">Trial</option>
                        <option value="suspended">Suspended</option>
                    </Select>
                </CardContent>
            </Card>

            <TableWrap>
                <Table>
                    <THead>
                        <TR>
                            <TH>School</TH>
                            <TH>Code</TH>
                            <TH>City</TH>
                            <TH>Plan</TH>
                            <TH>Students</TH>
                            <TH>Teachers</TH>
                            <TH>Status</TH>
                            <TH className="text-right">Actions</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <LoadingRow colSpan={8} />
                        ) : items.length === 0 ? (
                            <EmptyRow colSpan={8}>Koi school nahi mila</EmptyRow>
                        ) : (
                            items.map((s) => (
                                <TR key={s.id}>
                                    <TD>
                                        <p className="font-medium text-foreground">{s.name}</p>
                                        <p className="text-xs text-muted-foreground">{s.email || '-'}</p>
                                    </TD>
                                    <TD className="font-mono text-xs">{s.code}</TD>
                                    <TD>{s.city || '-'}</TD>
                                    <TD>
                                        {s.Subscriptions?.[0]?.plan ? (
                                            <Badge variant="secondary">{s.Subscriptions[0].plan.name}</Badge>
                                        ) : (
                                            <span className="text-muted-foreground">No plan</span>
                                        )}
                                    </TD>
                                    <TD className="font-medium">{s.studentCount ?? 0}</TD>
                                    <TD className="font-medium">{s.teacherCount ?? 0}</TD>
                                    <TD>
                                        <Badge
                                            variant={SCHOOL_STATUS_VARIANT[s.status] || 'outline'}
                                            className="capitalize"
                                        >
                                            {s.status}
                                        </Badge>
                                    </TD>
                                    <TD>
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                title="Is school ke andar jaayein"
                                                onClick={() => enterSchool(s)}
                                            >
                                                <LogIn />
                                            </Button>
                                            {canManage ? (
                                                <>
                                                    <Button variant="ghost" size="icon-sm" title="Edit" onClick={() => openForm(s)}>
                                                        <Pencil />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        title="Delete"
                                                        className="text-destructive hover:bg-destructive/10"
                                                        onClick={() => setDeleting(s)}
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </>
                                            ) : null}
                                        </div>
                                    </TD>
                                </TR>
                            ))
                        )}
                    </TBody>
                </Table>
            </TableWrap>

            <Pagination meta={meta} onPage={setPage} />

            <Modal
                open={formOpen}
                onOpenChange={setFormOpen}
                title={editing ? 'Edit school' : 'Add school'}
                description={editing ? editing.code : 'School ke saath uska pehla admin bhi ban jayega'}
                size="lg"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={submit} disabled={saving}>
                            {saving ? 'Saving...' : editing ? 'Save changes' : 'Create school'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={submit} className="space-y-6">
                    <section className="space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            School details
                        </h4>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <TextField label="School name" name="name" required value={form.name} onChange={set('name')} error={errors.name} />
                            <TextField
                                label="School code"
                                name="code"
                                required
                                placeholder="SPS-INDORE"
                                value={form.code}
                                onChange={set('code')}
                                error={errors.code}
                                disabled={Boolean(editing)}
                                hint={editing ? 'Code baad me badla nahi ja sakta' : 'Login par school pehchanne ke liye'}
                            />
                            <TextField label="Session" name="session" placeholder="2026-27" value={form.session} onChange={set('session')} error={errors.session} />
                            <TextField label="Email" name="email" type="email" value={form.email} onChange={set('email')} error={errors.email} />
                            <TextField label="Phone" name="phone" value={form.phone} onChange={set('phone')} error={errors.phone} />
                            <TextField label="Website" name="website" value={form.website} onChange={set('website')} error={errors.website} />
                            <TextField label="City" name="city" value={form.city} onChange={set('city')} error={errors.city} />
                            <TextField label="State" name="state" value={form.state} onChange={set('state')} error={errors.state} />
                            <TextField label="Pincode" name="pincode" value={form.pincode} onChange={set('pincode')} error={errors.pincode} />
                            <TextField label="Address" name="address" className="sm:col-span-2" value={form.address} onChange={set('address')} error={errors.address} />
                            <SelectField label="Status" name="status" value={form.status} onChange={set('status')}>
                                <option value="trial">Trial</option>
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                            </SelectField>
                        </div>
                    </section>

                    {!editing ? (
                        <section className="space-y-4 rounded-lg border border-border bg-muted/40 p-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Pehla School Admin
                            </h4>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <TextField label="Admin name" name="adminName" required value={form.adminName} onChange={set('adminName')} error={errors.adminName} />
                                <TextField label="Admin email" name="adminEmail" type="email" required value={form.adminEmail} onChange={set('adminEmail')} error={errors.adminEmail} />
                                <TextField label="Password" name="adminPassword" type="password" required value={form.adminPassword} onChange={set('adminPassword')} error={errors.adminPassword} hint="Kam se kam 6 character" />
                                <SelectField label="Plan" name="planId" value={form.planId} onChange={set('planId')} className="sm:col-span-2">
                                    <option value="">Koi plan nahi (baad me de sakte hain)</option>
                                    {plans.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </SelectField>
                            </div>
                        </section>
                    ) : null}

                    <button type="submit" className="hidden" />
                </form>
            </Modal>

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={'Delete ' + (deleting?.name || '') + '?'}
                message={
                    'Is school ka POORA data hat jayega - ' +
                    (deleting?.studentCount ?? 0) +
                    ' students, ' +
                    (deleting?.teacherCount ?? 0) +
                    ' teachers, classes, subjects aur saare logins. Ye wapas nahi ho sakta.'
                }
                loading={deleteBusy}
                onConfirm={confirmDelete}
            />
        </div>
    );
}
