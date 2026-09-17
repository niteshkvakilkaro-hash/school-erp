import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useNewParam } from '@/hooks/useNewParam';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow, LoadingRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { TextField, SelectField, TextareaField } from '@/components/ui/field';
import { formatDate, toDateInput } from '@/lib/utils';

const BLANK = {
    title: '',
    description: '',
    classId: '',
    sectionId: '',
    subjectId: '',
    teacherId: '',
    assignedDate: toDateInput(new Date()),
    dueDate: '',
    status: 'open',
};

export default function Homework() {
    const { can } = useAuth();
    const canManage = can('homework.manage');

    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [dueFilter, setDueFilter] = useState('');

    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
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
        api.get('/classes/options').then(({ data }) => setClasses(data.data)).catch(() => {});
        if (canManage) {
            api.get('/teachers/options').then(({ data }) => setTeachers(data.data)).catch(() => {});
        }
    }, [canManage]);

    // Form me class badalne par usi class ke subjects laate hain
    useEffect(() => {
        if (!form.classId) {
            setSubjects([]);
            return;
        }
        api.get('/subjects', { params: { classId: form.classId, limit: 100 } })
            .then(({ data }) => setSubjects(data.data.items))
            .catch(() => setSubjects([]));
    }, [form.classId]);

    const sections = useMemo(
        () => classes.find((c) => String(c.id) === String(form.classId))?.sections || [],
        [classes, form.classId]
    );

    const load = useCallback(() => {
        setLoading(true);
        const params = { page, limit: 10 };
        if (search) params.search = search;
        if (classFilter) params.classId = classFilter;
        if (dueFilter) params.due = dueFilter;

        api.get('/homework', { params })
            .then(({ data }) => {
                setItems(data.data.items);
                setMeta(data.data.meta);
            })
            .catch((err) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, [page, search, classFilter, dueFilter]);

    useEffect(() => {
        load();
    }, [load]);

    const openForm = (hw) => {
        setEditing(hw);
        setErrors({});
        setForm(
            hw
                ? {
                      title: hw.title,
                      description: hw.description || '',
                      classId: hw.classId || '',
                      sectionId: hw.sectionId || '',
                      subjectId: hw.subjectId || '',
                      teacherId: hw.teacherId || '',
                      assignedDate: toDateInput(hw.assignedDate),
                      dueDate: toDateInput(hw.dueDate),
                      status: hw.status,
                  }
                : { ...BLANK, classId: classFilter || '' }
        );
        setFormOpen(true);
    };

    useNewParam(() => {
        if (!canManage) return;
        openForm(null);
    });

    const set = (k) => (e) =>
        setForm((f) => {
            // Class badli to section aur subject dono reset - warna mismatch
            if (k === 'classId') return { ...f, classId: e.target.value, sectionId: '', subjectId: '' };
            return { ...f, [k]: e.target.value };
        });

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            const payload = {
                ...form,
                sectionId: form.sectionId || null,
                teacherId: form.teacherId || null,
            };
            if (editing) {
                await api.put('/homework/' + editing.id, payload);
                toast.success('Homework update ho gaya');
            } else {
                await api.post('/homework', payload);
                toast.success('Homework assign ho gaya');
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
            await api.delete('/homework/' + deleting.id);
            toast.success('Homework delete ho gaya');
            setDeleting(null);
            load();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setDeleteBusy(false);
        }
    };

    const todayStr = toDateInput(new Date());

    return (
        <div>
            <PageHeader
                title="Homework"
                subtitle={meta ? meta.total + ' assignments' : 'Loading...'}
                actions={
                    canManage ? (
                        <Button onClick={() => openForm(null)}>
                            <Plus /> Assign homework
                        </Button>
                    ) : null
                }
            />

            <Card className="mb-4">
                <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="relative lg:col-span-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Title ya description se search"
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
                    <Select
                        value={dueFilter}
                        onChange={(e) => {
                            setPage(1);
                            setDueFilter(e.target.value);
                        }}
                    >
                        <option value="">Saari dates</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="overdue">Overdue</option>
                    </Select>
                </CardContent>
            </Card>

            <TableWrap>
                <Table>
                    <THead>
                        <TR>
                            <TH>Title</TH>
                            <TH>Class</TH>
                            <TH>Subject</TH>
                            <TH>Teacher</TH>
                            <TH>Assigned</TH>
                            <TH>Due</TH>
                            <TH>Status</TH>
                            {canManage ? <TH className="text-right">Actions</TH> : null}
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <LoadingRow colSpan={canManage ? 8 : 7} />
                        ) : items.length === 0 ? (
                            <EmptyRow colSpan={canManage ? 8 : 7}>Koi homework nahi mila</EmptyRow>
                        ) : (
                            items.map((h) => {
                                const overdue = h.status === 'open' && h.dueDate < todayStr;
                                return (
                                    <TR key={h.id}>
                                        <TD>
                                            <p className="font-medium text-foreground">{h.title}</p>
                                            {h.description ? (
                                                <p className="max-w-sm truncate text-xs text-muted-foreground">
                                                    {h.description}
                                                </p>
                                            ) : null}
                                        </TD>
                                        <TD>
                                            <Badge variant="secondary">
                                                {h.schoolClass?.name || '-'}
                                                {h.section ? ' - ' + h.section.name : ''}
                                            </Badge>
                                        </TD>
                                        <TD>{h.subject?.name || '-'}</TD>
                                        <TD className="text-muted-foreground">
                                            {h.teacher?.user?.name || 'Unassigned'}
                                        </TD>
                                        <TD className="text-muted-foreground">{formatDate(h.assignedDate)}</TD>
                                        <TD>
                                            <span
                                                className={
                                                    overdue ? 'font-medium text-destructive' : 'text-muted-foreground'
                                                }
                                            >
                                                {formatDate(h.dueDate)}
                                            </span>
                                        </TD>
                                        <TD>
                                            {overdue ? (
                                                <Badge variant="danger" className="gap-1">
                                                    <AlertTriangle className="h-3 w-3" /> Overdue
                                                </Badge>
                                            ) : h.status === 'open' ? (
                                                <Badge variant="success">Open</Badge>
                                            ) : (
                                                <Badge variant="muted">Closed</Badge>
                                            )}
                                        </TD>
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
                                );
                            })
                        )}
                    </TBody>
                </Table>
            </TableWrap>

            <Pagination meta={meta} onPage={setPage} />

            <Modal
                open={formOpen}
                onOpenChange={setFormOpen}
                title={editing ? 'Edit homework' : 'Assign homework'}
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
                        label="Title"
                        name="title"
                        required
                        className="sm:col-span-2"
                        placeholder="Chapter 3 exercises"
                        value={form.title}
                        onChange={set('title')}
                        error={errors.title}
                    />
                    <SelectField
                        label="Class"
                        name="classId"
                        required
                        value={form.classId}
                        onChange={set('classId')}
                        error={errors.classId}
                    >
                        <option value="">Select class</option>
                        {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </SelectField>
                    <SelectField
                        label="Section"
                        name="sectionId"
                        value={form.sectionId}
                        onChange={set('sectionId')}
                        error={errors.sectionId}
                        disabled={!form.classId}
                        hint="Khaali chhodenge to poori class ko milega"
                    >
                        <option value="">Poori class</option>
                        {sections.map((s) => (
                            <option key={s.id} value={s.id}>
                                Section {s.name}
                            </option>
                        ))}
                    </SelectField>
                    <SelectField
                        label="Subject"
                        name="subjectId"
                        required
                        value={form.subjectId}
                        onChange={set('subjectId')}
                        error={errors.subjectId}
                        disabled={!form.classId}
                        hint={!form.classId ? 'Pehle class chuniye' : undefined}
                    >
                        <option value="">Select subject</option>
                        {subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
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
                                {t.user?.name}
                            </option>
                        ))}
                    </SelectField>
                    <TextField
                        label="Assigned date"
                        name="assignedDate"
                        type="date"
                        required
                        value={form.assignedDate}
                        onChange={set('assignedDate')}
                        error={errors.assignedDate}
                    />
                    <TextField
                        label="Due date"
                        name="dueDate"
                        type="date"
                        required
                        value={form.dueDate}
                        onChange={set('dueDate')}
                        error={errors.dueDate}
                    />
                    <SelectField
                        label="Status"
                        name="status"
                        className="sm:col-span-2"
                        value={form.status}
                        onChange={set('status')}
                    >
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                    </SelectField>
                    <TextareaField
                        label="Description"
                        name="description"
                        className="sm:col-span-2"
                        rows={3}
                        placeholder="Students ko kya karna hai"
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
                title={'Delete "' + (deleting?.title || '') + '"?'}
                message="Ye homework students ko dikhna band ho jayega."
                loading={deleteBusy}
                onConfirm={confirmDelete}
            />
        </div>
    );
}
