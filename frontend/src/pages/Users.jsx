import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow, LoadingRow } from '@/components/ui/table';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { TextField, SelectField, Field } from '@/components/ui/field';
import { formatDate, initials, fullName } from '@/lib/utils';

const BLANK = { name: '', email: '', password: '', phone: '', roleId: '', status: 'active', studentIds: [] };

export default function Users() {
    const { can, user: me } = useAuth();
    const canManage = can('users.manage');

    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [roles, setRoles] = useState([]);
    const [students, setStudents] = useState([]);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [childSearch, setChildSearch] = useState('');

    const search = useDebounce(searchInput, 400);
    const childQuery = useDebounce(childSearch, 400);

    useEffect(() => {
        api.get('/roles/options').then(({ data }) => setRoles(data.data)).catch(() => {});
    }, []);

    // Parent role chunne par bachche search karne ke liye
    const selectedRole = roles.find((r) => String(r.id) === String(form.roleId));
    const needsChildren = selectedRole?.slug === 'parent';

    useEffect(() => {
        if (!needsChildren) return;
        api.get('/students', { params: { limit: 20, search: childQuery || undefined } })
            .then(({ data }) => setStudents(data.data.items))
            .catch(() => {});
    }, [needsChildren, childQuery]);

    const load = useCallback(() => {
        setLoading(true);
        const params = { page, limit: 10 };
        if (search) params.search = search;
        if (roleFilter) params.roleId = roleFilter;

        api.get('/users', { params })
            .then(({ data }) => {
                setItems(data.data.items);
                setMeta(data.data.meta);
            })
            .catch((err) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, [page, search, roleFilter]);

    useEffect(() => {
        load();
    }, [load]);

    const openForm = (u) => {
        setEditing(u);
        setErrors({});
        setChildSearch('');
        setForm(
            u
                ? {
                      name: u.name,
                      email: u.email,
                      password: '',
                      phone: u.phone || '',
                      roleId: u.roleId,
                      status: u.status,
                      studentIds: (u.children || []).map((c) => c.id),
                  }
                : BLANK
        );
        setFormOpen(true);
    };

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const toggleChild = (id) =>
        setForm((f) => ({
            ...f,
            studentIds: f.studentIds.includes(id)
                ? f.studentIds.filter((x) => x !== id)
                : [...f.studentIds, id],
        }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            const payload = { ...form };
            if (editing && !payload.password) delete payload.password;
            if (!needsChildren) payload.studentIds = [];

            if (editing) {
                await api.put('/users/' + editing.id, payload);
                toast.success('User update ho gaya');
            } else {
                await api.post('/users', payload);
                toast.success('User ban gaya');
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
            await api.delete('/users/' + deleting.id);
            toast.success('User delete ho gaya');
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
                title="Users"
                subtitle={meta ? meta.total + ' accounts is school me' : 'Loading...'}
                actions={
                    canManage ? (
                        <Button onClick={() => openForm(null)}>
                            <Plus /> Add user
                        </Button>
                    ) : null
                }
            />

            <Card className="mb-4">
                <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
                    <div className="relative sm:col-span-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Naam, email ya phone se search"
                            className="pl-9"
                            value={searchInput}
                            onChange={(e) => {
                                setPage(1);
                                setSearchInput(e.target.value);
                            }}
                        />
                    </div>
                    <Select
                        value={roleFilter}
                        onChange={(e) => {
                            setPage(1);
                            setRoleFilter(e.target.value);
                        }}
                    >
                        <option value="">All roles</option>
                        {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.name}
                            </option>
                        ))}
                    </Select>
                </CardContent>
            </Card>

            <TableWrap>
                <Table>
                    <THead>
                        <TR>
                            <TH>User</TH>
                            <TH>Role</TH>
                            <TH>Phone</TH>
                            <TH>Linked students</TH>
                            <TH>Last login</TH>
                            <TH>Status</TH>
                            {canManage ? <TH className="text-right">Actions</TH> : null}
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <LoadingRow colSpan={canManage ? 7 : 6} />
                        ) : items.length === 0 ? (
                            <EmptyRow colSpan={canManage ? 7 : 6}>Koi user nahi mila</EmptyRow>
                        ) : (
                            items.map((u) => (
                                <TR key={u.id}>
                                    <TD>
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                                                {initials(u.name)}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-foreground">
                                                    {u.name}
                                                    {u.id === me?.id ? (
                                                        <span className="ml-1.5 text-xs text-muted-foreground">(aap)</span>
                                                    ) : null}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                                            </div>
                                        </div>
                                    </TD>
                                    <TD>
                                        <Badge variant={u.role?.portalOnly ? 'warning' : 'secondary'}>
                                            {u.role?.name || '-'}
                                        </Badge>
                                    </TD>
                                    <TD>{u.phone || '-'}</TD>
                                    <TD>
                                        {(u.children || []).length === 0 ? (
                                            <span className="text-muted-foreground">-</span>
                                        ) : (
                                            <div className="flex flex-wrap gap-1">
                                                {u.children.map((c) => (
                                                    <Badge key={c.id} variant="outline">
                                                        {fullName(c)}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </TD>
                                    <TD className="text-muted-foreground">
                                        {u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Kabhi nahi'}
                                    </TD>
                                    <TD>
                                        <StatusBadge status={u.status} />
                                    </TD>
                                    {canManage ? (
                                        <TD>
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon-sm" title="Edit" onClick={() => openForm(u)}>
                                                    <Pencil />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="Delete"
                                                    className="text-destructive hover:bg-destructive/10"
                                                    disabled={u.id === me?.id}
                                                    onClick={() => setDeleting(u)}
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

            <Pagination meta={meta} onPage={setPage} />

            <Modal
                open={formOpen}
                onOpenChange={setFormOpen}
                title={editing ? 'Edit user' : 'Add user'}
                description="Staff, parent ya koi bhi custom role ka account"
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
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField label="Full name" name="name" required value={form.name} onChange={set('name')} error={errors.name} />
                        <TextField label="Email" name="email" type="email" required value={form.email} onChange={set('email')} error={errors.email} />
                        <TextField
                            label="Password"
                            name="password"
                            type="password"
                            required={!editing}
                            value={form.password}
                            onChange={set('password')}
                            error={errors.password}
                            hint={editing ? 'Khaali chhodenge to password change nahi hoga' : 'Kam se kam 6 character'}
                        />
                        <TextField label="Phone" name="phone" value={form.phone} onChange={set('phone')} error={errors.phone} />
                        <SelectField
                            label="Role"
                            name="roleId"
                            required
                            value={form.roleId}
                            onChange={set('roleId')}
                            error={errors.roleId}
                            disabled={editing?.id === me?.id}
                            hint={editing?.id === me?.id ? 'Aap apna khud ka role nahi badal sakte' : undefined}
                        >
                            <option value="">Select role</option>
                            {roles.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name}
                                    {r.portalOnly ? ' (mobile app)' : ''}
                                </option>
                            ))}
                        </SelectField>
                        <SelectField
                            label="Status"
                            name="status"
                            value={form.status}
                            onChange={set('status')}
                            disabled={editing?.id === me?.id}
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </SelectField>
                    </div>

                    {needsChildren ? (
                        <Field
                            label="Linked students"
                            hint="Parent app me ye bachche dikhenge"
                            error={errors.studentIds}
                        >
                            <div className="space-y-2 rounded-lg border border-border p-3">
                                <Input
                                    placeholder="Student ka naam ya admission no"
                                    value={childSearch}
                                    onChange={(e) => setChildSearch(e.target.value)}
                                />
                                <div className="max-h-48 space-y-1 overflow-y-auto">
                                    {students.length === 0 ? (
                                        <p className="py-3 text-center text-sm text-muted-foreground">
                                            Koi student nahi mila
                                        </p>
                                    ) : (
                                        students.map((s) => (
                                            <label
                                                key={s.id}
                                                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={form.studentIds.includes(s.id)}
                                                    onChange={() => toggleChild(s.id)}
                                                    className="h-4 w-4 rounded border-input accent-[var(--primary)]"
                                                />
                                                <span className="min-w-0">
                                                    <span className="block truncate text-foreground">{fullName(s)}</span>
                                                    <span className="block truncate text-xs text-muted-foreground">
                                                        {s.admissionNo}
                                                        {s.schoolClass ? ' - ' + s.schoolClass.name : ''}
                                                    </span>
                                                </span>
                                            </label>
                                        ))
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {form.studentIds.length} selected
                                </p>
                            </div>
                        </Field>
                    ) : null}

                    <button type="submit" className="hidden" />
                </form>
            </Modal>

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={'Delete ' + (deleting?.name || '') + '?'}
                message="Teacher aur student ke accounts unke apne module se delete hote hain."
                loading={deleteBusy}
                onConfirm={confirmDelete}
            />
        </div>
    );
}
