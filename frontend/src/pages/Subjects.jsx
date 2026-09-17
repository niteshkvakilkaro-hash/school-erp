import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import api from '@/lib/api';
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

const BLANK = {
    name: '',
    code: '',
    classId: '',
    teacherId: '',
    type: 'theory',
    maxMarks: 100,
    passMarks: 33,
};

const TYPE_VARIANT = { theory: 'secondary', practical: 'default', elective: 'outline' };

export default function Subjects() {
    const { can } = useAuth();
    const canManage = can('subjects.manage');

    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [classes, setClasses] = useState([]);
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
        api.get('/classes/options').then(({ data }) => setClasses(data.data));
        if (canManage) api.get('/teachers/options').then(({ data }) => setTeachers(data.data));
    }, [canManage]);

    const load = useCallback(() => {
        setLoading(true);
        const params = { page, limit: 10 };
        if (search) params.search = search;
        if (classFilter) params.classId = classFilter;

        api.get('/subjects', { params })
            .then(({ data }) => {
                setItems(data.data.items);
                setMeta(data.data.meta);
            })
            .catch((err) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, [page, search, classFilter]);

    useEffect(() => {
        load();
    }, [load]);

    const openForm = (subject) => {
        setEditing(subject);
        setErrors({});
        setForm(
            subject
                ? {
                      name: subject.name,
                      code: subject.code,
                      classId: subject.classId || '',
                      teacherId: subject.teacherId || '',
                      type: subject.type,
                      maxMarks: subject.maxMarks,
                      passMarks: subject.passMarks,
                  }
                : { ...BLANK, classId: classFilter || '' }
        );
        setFormOpen(true);
    };

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            const payload = {
                ...form,
                classId: form.classId || null,
                teacherId: form.teacherId || null,
            };
            if (editing) {
                await api.put('/subjects/' + editing.id, payload);
                toast.success('Subject update ho gaya');
            } else {
                await api.post('/subjects', payload);
                toast.success('Subject ban gaya');
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
            await api.delete('/subjects/' + deleting.id);
            toast.success('Subject delete ho gaya');
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
                title="Subjects"
                subtitle="Class ke hisaab se subjects aur unke teachers"
                actions={
                    canManage ? (
                        <Button onClick={() => openForm(null)}>
                            <Plus /> Add subject
                        </Button>
                    ) : null
                }
            />

            <Card className="mb-4">
                <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
                    <div className="relative sm:col-span-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Subject name ya code se search"
                            className="pl-9"
                            value={searchInput}
                            onChange={(e) => {
                                setPage(1);
                                setSearchInput(e.target.value);
                            }}
                        />
                    </div>
                    <Select
                        value={classFilter}
                        onChange={(e) => {
                            setPage(1);
                            setClassFilter(e.target.value);
                        }}
                    >
                        <option value="">All classes</option>
                        {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </Select>
                </CardContent>
            </Card>

            <TableWrap>
                <Table>
                    <THead>
                        <TR>
                            <TH>Subject</TH>
                            <TH>Code</TH>
                            <TH>Class</TH>
                            <TH>Teacher</TH>
                            <TH>Type</TH>
                            <TH>Marks</TH>
                            {canManage ? <TH className="text-right">Actions</TH> : null}
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <LoadingRow colSpan={canManage ? 7 : 6} />
                        ) : items.length === 0 ? (
                            <EmptyRow colSpan={canManage ? 7 : 6}>Koi subject nahi mila</EmptyRow>
                        ) : (
                            items.map((s) => (
                                <TR key={s.id}>
                                    <TD className="font-medium">{s.name}</TD>
                                    <TD className="font-mono text-xs">{s.code}</TD>
                                    <TD>
                                        {s.schoolClass ? (
                                            <Badge variant="secondary">{s.schoolClass.name}</Badge>
                                        ) : (
                                            <span className="text-muted-foreground">All classes</span>
                                        )}
                                    </TD>
                                    <TD>
                                        {s.teacher?.user?.name || (
                                            <span className="text-muted-foreground">Unassigned</span>
                                        )}
                                    </TD>
                                    <TD>
                                        <Badge variant={TYPE_VARIANT[s.type] || 'outline'} className="capitalize">
                                            {s.type}
                                        </Badge>
                                    </TD>
                                    <TD className="text-muted-foreground">
                                        {s.passMarks} / {s.maxMarks}
                                    </TD>
                                    {canManage ? (
                                        <TD>
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="Edit"
                                                    onClick={() => openForm(s)}
                                                >
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
                title={editing ? 'Edit subject' : 'Add subject'}
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
                        label="Subject name"
                        name="name"
                        required
                        placeholder="Mathematics"
                        value={form.name}
                        onChange={set('name')}
                        error={errors.name}
                    />
                    <TextField
                        label="Subject code"
                        name="code"
                        required
                        placeholder="MATH-10"
                        value={form.code}
                        onChange={set('code')}
                        error={errors.code}
                        hint="Unique hona chahiye"
                    />
                    <SelectField
                        label="Class"
                        name="classId"
                        value={form.classId}
                        onChange={set('classId')}
                        error={errors.classId}
                    >
                        <option value="">All classes</option>
                        {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </SelectField>
                    <SelectField
                        label="Teacher"
                        name="teacherId"
                        value={form.teacherId}
                        onChange={set('teacherId')}
                        error={errors.teacherId}
                    >
                        <option value="">Unassigned</option>
                        {teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.user?.name} ({t.employeeNo})
                            </option>
                        ))}
                    </SelectField>
                    <SelectField label="Type" name="type" value={form.type} onChange={set('type')}>
                        <option value="theory">Theory</option>
                        <option value="practical">Practical</option>
                        <option value="elective">Elective</option>
                    </SelectField>
                    <div className="grid grid-cols-2 gap-3">
                        <TextField
                            label="Max marks"
                            name="maxMarks"
                            type="number"
                            min="1"
                            value={form.maxMarks}
                            onChange={set('maxMarks')}
                            error={errors.maxMarks}
                        />
                        <TextField
                            label="Pass marks"
                            name="passMarks"
                            type="number"
                            min="0"
                            value={form.passMarks}
                            onChange={set('passMarks')}
                            error={errors.passMarks}
                        />
                    </div>
                    <button type="submit" className="hidden" />
                </form>
            </Modal>

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={'Delete ' + (deleting?.name || '') + '?'}
                message="Subject ka record permanently hat jayega."
                loading={deleteBusy}
                onConfirm={confirmDelete}
            />
        </div>
    );
}
