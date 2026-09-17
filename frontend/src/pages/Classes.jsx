import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useNewParam } from '@/hooks/useNewParam';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow, LoadingRow } from '@/components/ui/table';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { TextField, SelectField, TextareaField } from '@/components/ui/field';

const BLANK = { name: '', level: 0, classTeacherId: '', description: '', status: 'active' };

export default function Classes() {
    const { can } = useAuth();
    const canManage = can('classes.manage');

    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [teachers, setTeachers] = useState([]);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const search = useDebounce(searchInput, 400);

    useEffect(() => {
        if (canManage) api.get('/teachers/options').then(({ data }) => setTeachers(data.data));
    }, [canManage]);

    const load = useCallback(() => {
        setLoading(true);
        const params = { page, limit: 10 };
        if (search) params.search = search;

        api.get('/classes', { params })
            .then(({ data }) => {
                setItems(data.data.items);
                setMeta(data.data.meta);
            })
            .catch((err) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, [page, search]);

    useEffect(() => {
        load();
    }, [load]);

    const openForm = (cls) => {
        setEditing(cls);
        setErrors({});
        setForm(
            cls
                ? {
                      name: cls.name,
                      level: cls.level ?? 0,
                      classTeacherId: cls.classTeacherId || '',
                      description: cls.description || '',
                      status: cls.status,
                  }
                : BLANK
        );
        setFormOpen(true);
    };

    useNewParam(() => {
        if (!canManage) return;
        openForm(null);
    });

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            const payload = { ...form, classTeacherId: form.classTeacherId || null };
            if (editing) {
                await api.put('/classes/' + editing.id, payload);
                toast.success('Class update ho gayi');
            } else {
                await api.post('/classes', payload);
                toast.success('Class ban gayi');
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
            await api.delete('/classes/' + deleting.id);
            toast.success('Class delete ho gayi');
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
                title="Classes"
                subtitle="Class banaiye, class-teacher assign kijiye"
                actions={
                    canManage ? (
                        <Button onClick={() => openForm(null)}>
                            <Plus /> Add class
                        </Button>
                    ) : null
                }
            />

            <Card className="mb-4">
                <CardContent className="p-4">
                    <div className="relative max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Class name se search"
                            className="pl-9"
                            value={searchInput}
                            onChange={(e) => {
                                setPage(1);
                                setSearchInput(e.target.value);
                            }}
                        />
                    </div>
                </CardContent>
            </Card>

            <TableWrap>
                <Table>
                    <THead>
                        <TR>
                            <TH>Class</TH>
                            <TH>Level</TH>
                            <TH>Class teacher</TH>
                            <TH>Sections</TH>
                            <TH>Students</TH>
                            <TH>Status</TH>
                            {canManage ? <TH className="text-right">Actions</TH> : null}
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <LoadingRow colSpan={canManage ? 7 : 6} />
                        ) : items.length === 0 ? (
                            <EmptyRow colSpan={canManage ? 7 : 6}>Abhi koi class nahi bani</EmptyRow>
                        ) : (
                            items.map((c) => (
                                <TR key={c.id}>
                                    <TD>
                                        <p className="font-medium text-foreground">{c.name}</p>
                                        {c.description ? (
                                            <p className="text-xs text-muted-foreground">{c.description}</p>
                                        ) : null}
                                    </TD>
                                    <TD>{c.level}</TD>
                                    <TD>{c.classTeacher?.user?.name || <span className="text-muted-foreground">Unassigned</span>}</TD>
                                    <TD>
                                        <div className="flex flex-wrap gap-1">
                                            {(c.sections || []).length === 0 ? (
                                                <span className="text-muted-foreground">-</span>
                                            ) : (
                                                c.sections.map((s) => (
                                                    <Badge key={s.id} variant="secondary">
                                                        {s.name}
                                                    </Badge>
                                                ))
                                            )}
                                        </div>
                                    </TD>
                                    <TD className="font-medium">{c.studentCount ?? 0}</TD>
                                    <TD>
                                        <StatusBadge status={c.status} />
                                    </TD>
                                    {canManage ? (
                                        <TD>
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="Edit"
                                                    onClick={() => openForm(c)}
                                                >
                                                    <Pencil />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="Delete"
                                                    className="text-destructive hover:bg-destructive/10"
                                                    onClick={() => setDeleting(c)}
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
                title={editing ? 'Edit class' : 'Add class'}
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
                        label="Class name"
                        name="name"
                        required
                        placeholder="Class 10"
                        value={form.name}
                        onChange={set('name')}
                        error={errors.name}
                    />
                    <TextField
                        label="Level"
                        name="level"
                        type="number"
                        min="0"
                        value={form.level}
                        onChange={set('level')}
                        error={errors.level}
                        hint="Sorting ke liye - Class 10 ka level 10"
                    />
                    <SelectField
                        label="Class teacher"
                        name="classTeacherId"
                        value={form.classTeacherId}
                        onChange={set('classTeacherId')}
                        error={errors.classTeacherId}
                    >
                        <option value="">Unassigned</option>
                        {teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.user?.name} ({t.employeeNo})
                            </option>
                        ))}
                    </SelectField>
                    <SelectField label="Status" name="status" value={form.status} onChange={set('status')}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </SelectField>
                    <TextareaField
                        label="Description"
                        name="description"
                        className="sm:col-span-2"
                        rows={2}
                        value={form.description}
                        onChange={set('description')}
                        error={errors.description}
                    />
                    <button type="submit" className="hidden" />
                </form>
            </Modal>

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={'Delete ' + (deleting?.name || '') + '?'}
                message="Class ke saare sections aur subjects bhi hat jayenge. Students wali class delete nahi hogi."
                loading={deleteBusy}
                onConfirm={confirmDelete}
            />
        </div>
    );
}
