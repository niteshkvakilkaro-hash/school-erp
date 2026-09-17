import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, RotateCcw } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useNewParam } from '@/hooks/useNewParam';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow, LoadingRow } from '@/components/ui/table';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { StudentForm } from './StudentForm';
import { formatDate, fullName, titleCase } from '@/lib/utils';

const EMPTY_FILTERS = { search: '', classId: '', sectionId: '', status: '', sort: 'newest' };

export default function Students() {
    const { can } = useAuth();
    const canCreate = can('students.create');
    const canEdit = can('students.update');
    const canDelete = can('students.delete');
    const canAct = canCreate || canEdit || canDelete;

    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [classes, setClasses] = useState([]);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const search = useDebounce(filters.search, 400);

    useNewParam(() => {
        if (!canCreate) return;
        setEditing(null);
        setFormOpen(true);
    });

    useEffect(() => {
        api.get('/classes/options').then(({ data }) => setClasses(data.data));
    }, []);

    const load = useCallback(() => {
        setLoading(true);
        const params = { page, limit: 10, sort: filters.sort };
        if (search) params.search = search;
        if (filters.classId) params.classId = filters.classId;
        if (filters.sectionId) params.sectionId = filters.sectionId;
        if (filters.status) params.status = filters.status;

        api.get('/students', { params })
            .then(({ data }) => {
                setItems(data.data.items);
                setMeta(data.data.meta);
            })
            .catch((err) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, [page, search, filters.classId, filters.sectionId, filters.status, filters.sort]);

    useEffect(() => {
        load();
    }, [load]);

    // Filter badalte hi page 1 par wapas - warna khaali page dikhta hai
    const setFilter = (k) => (e) => {
        const value = e.target.value;
        setPage(1);
        setFilters((f) => (k === 'classId' ? { ...f, classId: value, sectionId: '' } : { ...f, [k]: value }));
    };

    const sections = classes.find((c) => String(c.id) === String(filters.classId))?.sections || [];

    const confirmDelete = async () => {
        setDeleteBusy(true);
        try {
            await api.delete('/students/' + deleting.id);
            toast.success('Student delete ho gaya');
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
                title="Students"
                subtitle={meta ? meta.total + ' students registered' : 'Loading...'}
                actions={
                    canCreate ? (
                        <Button
                            onClick={() => {
                                setEditing(null);
                                setFormOpen(true);
                            }}
                        >
                            <Plus /> New admission
                        </Button>
                    ) : null
                }
            />

            <Card className="mb-4">
                <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="relative lg:col-span-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Naam, admission no, roll ya phone se search"
                            className="pl-9"
                            value={filters.search}
                            onChange={setFilter('search')}
                        />
                    </div>

                    <Select value={filters.classId} onChange={setFilter('classId')}>
                        <option value="">All classes</option>
                        {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </Select>

                    <Select
                        value={filters.sectionId}
                        onChange={setFilter('sectionId')}
                        disabled={!filters.classId}
                    >
                        <option value="">All sections</option>
                        {sections.map((s) => (
                            <option key={s.id} value={s.id}>
                                Section {s.name}
                            </option>
                        ))}
                    </Select>

                    <div className="flex gap-2">
                        <Select value={filters.status} onChange={setFilter('status')}>
                            <option value="">All status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="alumni">Alumni</option>
                        </Select>
                        <Button
                            variant="outline"
                            size="icon"
                            title="Reset filters"
                            onClick={() => {
                                setFilters(EMPTY_FILTERS);
                                setPage(1);
                            }}
                        >
                            <RotateCcw />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <TableWrap>
                <Table>
                    <THead>
                        <TR>
                            <TH>Admission No</TH>
                            <TH>Student</TH>
                            <TH>Class / Section</TH>
                            <TH>Roll</TH>
                            <TH>Guardian</TH>
                            <TH>Admitted</TH>
                            <TH>Status</TH>
                            {canAct ? <TH className="text-right">Actions</TH> : null}
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <LoadingRow colSpan={canAct ? 8 : 7} />
                        ) : items.length === 0 ? (
                            <EmptyRow colSpan={canAct ? 8 : 7}>
                                Is filter par koi student nahi mila
                            </EmptyRow>
                        ) : (
                            items.map((s) => (
                                <TR key={s.id}>
                                    <TD className="font-mono text-xs">{s.admissionNo}</TD>
                                    <TD>
                                        <p className="font-medium text-foreground">{fullName(s)}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {titleCase(s.gender || '-')} &middot; {formatDate(s.dob)}
                                        </p>
                                    </TD>
                                    <TD>
                                        {s.schoolClass ? (
                                            <Badge variant="secondary">
                                                {s.schoolClass.name}
                                                {s.section ? ' - ' + s.section.name : ''}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground">Unassigned</span>
                                        )}
                                    </TD>
                                    <TD>{s.rollNo || '-'}</TD>
                                    <TD>
                                        <p className="text-sm">{s.fatherName || '-'}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {s.guardianPhone || '-'}
                                        </p>
                                    </TD>
                                    <TD className="text-muted-foreground">
                                        {formatDate(s.admissionDate)}
                                    </TD>
                                    <TD>
                                        <StatusBadge status={s.status} />
                                    </TD>
                                    {canAct ? (
                                        <TD>
                                            <div className="flex items-center justify-end gap-1">
                                                {canEdit ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        title="Edit"
                                                        onClick={() => {
                                                            setEditing(s);
                                                            setFormOpen(true);
                                                        }}
                                                    >
                                                        <Pencil />
                                                    </Button>
                                                ) : null}
                                                {canDelete ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        title="Delete"
                                                        className="text-destructive hover:bg-destructive/10"
                                                        onClick={() => setDeleting(s)}
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                ) : null}
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

            <StudentForm
                open={formOpen}
                onOpenChange={setFormOpen}
                student={editing}
                classes={classes}
                onSaved={load}
            />

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={'Delete ' + (deleting ? fullName(deleting) : '') + '?'}
                message="Student ka record aur uska login account dono hat jayenge."
                loading={deleteBusy}
                onConfirm={confirmDelete}
            />
        </div>
    );
}
