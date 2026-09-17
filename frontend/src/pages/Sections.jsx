import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useNewParam } from '@/hooks/useNewParam';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow, LoadingRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { TextField, SelectField } from '@/components/ui/field';

const BLANK = { name: '', classId: '', capacity: 40, teacherId: '', roomNo: '' };

export default function Sections() {
    const { can } = useAuth();
    const canManage = can('sections.manage');

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
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

    useEffect(() => {
        api.get('/classes/options').then(({ data }) => setClasses(data.data));
        if (canManage) api.get('/teachers/options').then(({ data }) => setTeachers(data.data));
    }, [canManage]);

    const load = useCallback(() => {
        setLoading(true);
        const params = {};
        if (classFilter) params.classId = classFilter;

        api.get('/sections', { params })
            .then(({ data }) => setItems(data.data))
            .catch((err) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, [classFilter]);

    useEffect(() => {
        load();
    }, [load]);

    const openForm = (section) => {
        setEditing(section);
        setErrors({});
        setForm(
            section
                ? {
                      name: section.name,
                      classId: section.classId,
                      capacity: section.capacity,
                      teacherId: section.teacherId || '',
                      roomNo: section.roomNo || '',
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
            const payload = { ...form, teacherId: form.teacherId || null };
            if (editing) {
                await api.put('/sections/' + editing.id, payload);
                toast.success('Section update ho gaya');
            } else {
                await api.post('/sections', payload);
                toast.success('Section ban gaya');
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
            await api.delete('/sections/' + deleting.id);
            toast.success('Section delete ho gaya');
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
                title="Sections"
                subtitle="Har class ke sections, capacity aur section teacher"
                actions={
                    canManage ? (
                        <Button onClick={() => openForm(null)}>
                            <Plus /> Add section
                        </Button>
                    ) : null
                }
            />

            <Card className="mb-4">
                <CardContent className="p-4">
                    <Select
                        className="max-w-xs"
                        value={classFilter}
                        onChange={(e) => setClassFilter(e.target.value)}
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
                            <TH>Class</TH>
                            <TH>Section</TH>
                            <TH>Section teacher</TH>
                            <TH>Room</TH>
                            <TH>Occupancy</TH>
                            {canManage ? <TH className="text-right">Actions</TH> : null}
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <LoadingRow colSpan={canManage ? 6 : 5} />
                        ) : items.length === 0 ? (
                            <EmptyRow colSpan={canManage ? 6 : 5}>Koi section nahi mila</EmptyRow>
                        ) : (
                            items.map((s) => {
                                const full = s.studentCount >= s.capacity;
                                return (
                                    <TR key={s.id}>
                                        <TD className="font-medium">{s.schoolClass?.name || '-'}</TD>
                                        <TD>
                                            <Badge variant="secondary">Section {s.name}</Badge>
                                        </TD>
                                        <TD>
                                            {s.teacher?.user?.name || (
                                                <span className="text-muted-foreground">Unassigned</span>
                                            )}
                                        </TD>
                                        <TD>{s.roomNo || '-'}</TD>
                                        <TD>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">
                                                    {s.studentCount} / {s.capacity}
                                                </span>
                                                {full ? <Badge variant="warning">Full</Badge> : null}
                                            </div>
                                            <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full bg-primary"
                                                    style={{
                                                        width:
                                                            Math.min(
                                                                100,
                                                                (s.studentCount / (s.capacity || 1)) * 100
                                                            ) + '%',
                                                    }}
                                                />
                                            </div>
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
                                );
                            })
                        )}
                    </TBody>
                </Table>
            </TableWrap>

            <Modal
                open={formOpen}
                onOpenChange={setFormOpen}
                title={editing ? 'Edit section' : 'Add section'}
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
                    <TextField
                        label="Section name"
                        name="name"
                        required
                        placeholder="A"
                        value={form.name}
                        onChange={set('name')}
                        error={errors.name}
                    />
                    <TextField
                        label="Capacity"
                        name="capacity"
                        type="number"
                        min="1"
                        value={form.capacity}
                        onChange={set('capacity')}
                        error={errors.capacity}
                    />
                    <TextField
                        label="Room No"
                        name="roomNo"
                        value={form.roomNo}
                        onChange={set('roomNo')}
                        error={errors.roomNo}
                    />
                    <SelectField
                        label="Section teacher"
                        name="teacherId"
                        className="sm:col-span-2"
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
                    <button type="submit" className="hidden" />
                </form>
            </Modal>

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={'Delete section ' + (deleting?.name || '') + '?'}
                message="Jis section me students hain wo delete nahi hoga."
                loading={deleteBusy}
                onConfirm={confirmDelete}
            />
        </div>
    );
}
