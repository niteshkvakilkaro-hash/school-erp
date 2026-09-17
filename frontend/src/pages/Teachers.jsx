import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useNewParam } from '@/hooks/useNewParam';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow, LoadingRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { TeacherForm } from './TeacherForm';
import { formatCurrency, formatDate, initials } from '@/lib/utils';

export default function Teachers() {
    const { can } = useAuth();
    const canCreate = can('teachers.create');
    const canEdit = can('teachers.update');
    const canDelete = can('teachers.delete');
    const canAct = canEdit || canDelete;

    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [status, setStatus] = useState('');

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const search = useDebounce(searchInput, 400);

    useNewParam(() => {
        if (!canCreate) return;
        setEditing(null);
        setFormOpen(true);
    });

    const load = useCallback(() => {
        setLoading(true);
        const params = { page, limit: 10, sort: 'name' };
        if (search) params.search = search;
        if (status) params.status = status;

        api.get('/teachers', { params })
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

    const confirmDelete = async () => {
        setDeleteBusy(true);
        try {
            await api.delete('/teachers/' + deleting.id);
            toast.success('Teacher delete ho gaya');
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
                title="Teachers"
                subtitle={meta ? meta.total + ' teachers on staff' : 'Loading...'}
                actions={
                    canCreate ? (
                        <Button
                            onClick={() => {
                                setEditing(null);
                                setFormOpen(true);
                            }}
                        >
                            <Plus /> Add teacher
                        </Button>
                    ) : null
                }
            />

            <Card className="mb-4">
                <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
                    <div className="relative sm:col-span-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Naam, email, employee no ya subject se search"
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
                        <option value="inactive">Inactive</option>
                    </Select>
                </CardContent>
            </Card>

            <TableWrap>
                <Table>
                    <THead>
                        <TR>
                            <TH>Teacher</TH>
                            <TH>Employee No</TH>
                            <TH>Specialization</TH>
                            <TH>Experience</TH>
                            <TH>Joined</TH>
                            <TH>Salary</TH>
                            <TH>Status</TH>
                            {canAct ? <TH className="text-right">Actions</TH> : null}
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <LoadingRow colSpan={canAct ? 8 : 7} />
                        ) : items.length === 0 ? (
                            <EmptyRow colSpan={canAct ? 8 : 7}>Koi teacher nahi mila</EmptyRow>
                        ) : (
                            items.map((t) => (
                                <TR key={t.id}>
                                    <TD>
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                                                {initials(t.user?.name || '')}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-foreground">
                                                    {t.user?.name}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {t.user?.email}
                                                </p>
                                            </div>
                                        </div>
                                    </TD>
                                    <TD className="font-mono text-xs">{t.employeeNo}</TD>
                                    <TD>
                                        <p className="text-sm">{t.specialization || '-'}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {t.qualification || '-'}
                                        </p>
                                    </TD>
                                    <TD>{t.experienceYears ? t.experienceYears + ' yrs' : '-'}</TD>
                                    <TD className="text-muted-foreground">{formatDate(t.joiningDate)}</TD>
                                    <TD>{formatCurrency(t.salary)}</TD>
                                    <TD>
                                        <StatusBadge status={t.status} />
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
                                                            setEditing(t);
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
                                                        onClick={() => setDeleting(t)}
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

            <TeacherForm
                open={formOpen}
                onOpenChange={setFormOpen}
                teacher={editing}
                onSaved={load}
            />

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={'Delete ' + (deleting?.user?.name || '') + '?'}
                message="Teacher ka account hat jayega. Unke subjects, sections aur class-teacher assignment automatically unassign ho jayenge."
                loading={deleteBusy}
                onConfirm={confirmDelete}
            />
        </div>
    );
}
