import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, CalendarRange, Eye, EyeOff, ListChecks } from 'lucide-react';
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
import { ExamDetail } from '@/components/exams/ExamDetail';
import { formatDate, toDateInput, titleCase } from '@/lib/utils';

const TYPES = ['unit-test', 'mid-term', 'final', 'practical', 'other'];

const STATUS_VARIANT = { upcoming: 'warning', ongoing: 'default', completed: 'muted' };

const BLANK = {
    name: '',
    type: 'unit-test',
    classId: '',
    startDate: toDateInput(new Date()),
    endDate: '',
    description: '',
};

export default function Exams() {
    const { can } = useAuth();
    const canManage = can('exams.manage');
    const canPublish = can('exams.publish');

    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [classes, setClasses] = useState([]);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [detailId, setDetailId] = useState(null);

    const search = useDebounce(searchInput, 400);

    useEffect(() => {
        api.get('/classes/options').then(({ data }) => setClasses(data.data)).catch(() => {});
    }, []);

    const load = useCallback(() => {
        setLoading(true);
        const params = { page, limit: 10 };
        if (search) params.search = search;
        if (classFilter) params.classId = classFilter;
        if (statusFilter) params.status = statusFilter;

        api.get('/exams', { params })
            .then(({ data }) => {
                setItems(data.data.items);
                setMeta(data.data.meta);
            })
            .catch((err) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, [page, search, classFilter, statusFilter]);

    useEffect(() => {
        load();
    }, [load]);

    const openForm = (exam) => {
        setEditing(exam);
        setErrors({});
        setForm(
            exam
                ? {
                      name: exam.name,
                      type: exam.type,
                      classId: exam.classId || '',
                      startDate: toDateInput(exam.startDate),
                      endDate: toDateInput(exam.endDate),
                      description: exam.description || '',
                  }
                : { ...BLANK, classId: classFilter || '' }
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
            const payload = { ...form, classId: form.classId || null };
            if (editing) {
                await api.put('/exams/' + editing.id, payload);
                toast.success('Exam update ho gaya');
            } else {
                await api.post('/exams', payload);
                toast.success('Exam ban gaya');
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

    const togglePublish = async (exam) => {
        try {
            const { data } = await api.post('/exams/' + exam.id + '/publish');
            toast.success(data.message);
            load();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const confirmDelete = async () => {
        setDeleteBusy(true);
        try {
            await api.delete('/exams/' + deleting.id);
            toast.success('Exam delete ho gaya');
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
                title="Exams & Results"
                subtitle={meta ? meta.total + ' exams' : 'Loading...'}
                actions={
                    canManage ? (
                        <Button onClick={() => openForm(null)}>
                            <Plus /> Create exam
                        </Button>
                    ) : null
                }
            />

            <Card className="mb-4">
                <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="relative lg:col-span-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Exam ke naam se search"
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
                        value={statusFilter}
                        onChange={(e) => {
                            setPage(1);
                            setStatusFilter(e.target.value);
                        }}
                    >
                        <option value="">All status</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="completed">Completed</option>
                    </Select>
                </CardContent>
            </Card>

            <TableWrap>
                <Table>
                    <THead>
                        <TR>
                            <TH>Exam</TH>
                            <TH>Type</TH>
                            <TH>Class</TH>
                            <TH>Dates</TH>
                            <TH>Papers</TH>
                            <TH>Status</TH>
                            <TH>Results</TH>
                            <TH className="text-right">Actions</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <LoadingRow colSpan={8} />
                        ) : items.length === 0 ? (
                            <EmptyRow colSpan={8}>Koi exam nahi mila</EmptyRow>
                        ) : (
                            items.map((e) => (
                                <TR key={e.id}>
                                    <TD>
                                        <p className="font-medium text-foreground">{e.name}</p>
                                        {e.description ? (
                                            <p className="max-w-xs truncate text-xs text-muted-foreground">
                                                {e.description}
                                            </p>
                                        ) : null}
                                    </TD>
                                    <TD>
                                        <Badge variant="outline" className="capitalize">
                                            {e.type.replace('-', ' ')}
                                        </Badge>
                                    </TD>
                                    <TD>
                                        {e.schoolClass ? (
                                            <Badge variant="secondary">{e.schoolClass.name}</Badge>
                                        ) : (
                                            <span className="text-muted-foreground">All classes</span>
                                        )}
                                    </TD>
                                    <TD className="whitespace-nowrap text-muted-foreground">
                                        {formatDate(e.startDate)}
                                        <span className="mx-1">-</span>
                                        {formatDate(e.endDate)}
                                    </TD>
                                    <TD className="font-medium">{e.paperCount ?? 0}</TD>
                                    <TD>
                                        <Badge variant={STATUS_VARIANT[e.status] || 'outline'} className="capitalize">
                                            {e.status}
                                        </Badge>
                                    </TD>
                                    <TD>
                                        {e.resultsPublished ? (
                                            <Badge variant="success">Published</Badge>
                                        ) : (
                                            <Badge variant="muted">Hidden</Badge>
                                        )}
                                    </TD>
                                    <TD>
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                title="Datesheet, marks aur results"
                                                onClick={() => setDetailId(e.id)}
                                            >
                                                <ListChecks />
                                            </Button>
                                            {canPublish ? (
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title={e.resultsPublished ? 'Results chhupaiye' : 'Results publish kijiye'}
                                                    onClick={() => togglePublish(e)}
                                                >
                                                    {e.resultsPublished ? <EyeOff /> : <Eye />}
                                                </Button>
                                            ) : null}
                                            {canManage ? (
                                                <>
                                                    <Button variant="ghost" size="icon-sm" title="Edit" onClick={() => openForm(e)}>
                                                        <Pencil />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        title="Delete"
                                                        className="text-destructive hover:bg-destructive/10"
                                                        onClick={() => setDeleting(e)}
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
                title={editing ? 'Edit exam' : 'Create exam'}
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
                        label="Exam name"
                        name="name"
                        required
                        className="sm:col-span-2"
                        placeholder="Unit Test 1"
                        value={form.name}
                        onChange={set('name')}
                        error={errors.name}
                    />
                    <SelectField label="Type" name="type" value={form.type} onChange={set('type')}>
                        {TYPES.map((t) => (
                            <option key={t} value={t}>
                                {titleCase(t.replace('-', ' '))}
                            </option>
                        ))}
                    </SelectField>
                    <SelectField
                        label="Class"
                        name="classId"
                        value={form.classId}
                        onChange={set('classId')}
                        error={errors.classId}
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
                        label="Start date"
                        name="startDate"
                        type="date"
                        required
                        value={form.startDate}
                        onChange={set('startDate')}
                        error={errors.startDate}
                    />
                    <TextField
                        label="End date"
                        name="endDate"
                        type="date"
                        required
                        value={form.endDate}
                        onChange={set('endDate')}
                        error={errors.endDate}
                    />
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

            <ExamDetail examId={detailId} onClose={() => setDetailId(null)} onChanged={load} />

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={'Delete ' + (deleting?.name || '') + '?'}
                message="Jis exam ke marks bhare ja chuke hain wo delete nahi hoga."
                loading={deleteBusy}
                onConfirm={confirmDelete}
            />
        </div>
    );
}
