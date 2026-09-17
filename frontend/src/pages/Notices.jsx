import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, Megaphone, CalendarDays } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useNewParam } from '@/hooks/useNewParam';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { TextField, SelectField, TextareaField } from '@/components/ui/field';
import { formatDate, toDateInput, titleCase, cn } from '@/lib/utils';

const CATEGORIES = ['general', 'academic', 'event', 'holiday', 'exam', 'fee', 'urgent'];
const AUDIENCES = ['all', 'staff', 'students', 'parents', 'class'];
const PRIORITIES = ['low', 'medium', 'high'];

const CATEGORY_TONE = {
    general: 'secondary',
    academic: 'default',
    event: 'default',
    holiday: 'warning',
    exam: 'danger',
    fee: 'warning',
    urgent: 'danger',
};
const STATUS_TONE = { live: 'success', scheduled: 'warning', expired: 'muted', draft: 'outline' };
const PRIORITY_TONE = { high: 'danger', medium: 'warning', low: 'muted' };

const BLANK = {
    title: '',
    body: '',
    category: 'general',
    audience: 'all',
    priority: 'medium',
    classId: '',
    sectionId: '',
    publishOn: toDateInput(new Date()),
    expiresOn: '',
    eventDate: '',
    isPublished: true,
};

export default function Notices() {
    const { can } = useAuth();
    const canManage = can('notices.manage');

    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [classes, setClasses] = useState([]);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);

    const search = useDebounce(searchInput, 400);

    useEffect(() => {
        api.get('/classes/options').then(({ data }) => setClasses(data.data)).catch(() => {});
    }, []);

    const sections = useMemo(
        () => classes.find((c) => String(c.id) === String(form.classId))?.sections || [],
        [classes, form.classId]
    );

    const load = useCallback(() => {
        setLoading(true);
        const params = { page, limit: 10 };
        if (search) params.search = search;
        if (categoryFilter) params.category = categoryFilter;
        if (statusFilter) params.status = statusFilter;

        api.get('/notices', { params })
            .then(({ data }) => {
                setItems(data.data.items);
                setMeta(data.data.meta);
            })
            .catch((err) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, [page, search, categoryFilter, statusFilter]);

    useEffect(() => {
        load();
    }, [load]);

    const openForm = (n) => {
        setEditing(n);
        setErrors({});
        setForm(
            n
                ? {
                      title: n.title,
                      body: n.body,
                      category: n.category,
                      audience: n.audience,
                      priority: n.priority,
                      classId: n.classId || '',
                      sectionId: n.sectionId || '',
                      publishOn: toDateInput(n.publishOn),
                      expiresOn: toDateInput(n.expiresOn),
                      eventDate: toDateInput(n.eventDate),
                      isPublished: n.isPublished,
                  }
                : BLANK
        );
        setFormOpen(true);
    };

    useNewParam(() => {
        if (!canManage) return;
        openForm(null);
    });

    const set = (k) => (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm((f) => {
            if (k === 'classId') return { ...f, classId: value, sectionId: '' };
            // Class audience chhodne par class/section clear
            if (k === 'audience' && value !== 'class') {
                return { ...f, audience: value, classId: '', sectionId: '' };
            }
            return { ...f, [k]: value };
        });
    };

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            const payload = {
                ...form,
                classId: form.classId || null,
                sectionId: form.sectionId || null,
                expiresOn: form.expiresOn || null,
                eventDate: form.eventDate || null,
            };
            if (editing) {
                await api.put('/notices/' + editing.id, payload);
                toast.success('Notice update ho gaya');
            } else {
                await api.post('/notices', payload);
                toast.success('Notice publish ho gaya');
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
        try {
            await api.delete('/notices/' + deleting.id);
            toast.success('Notice delete ho gaya');
            setDeleting(null);
            load();
        } catch (err) {
            toast.error(err.message);
        }
    };

    return (
        <div>
            <PageHeader
                title="Notices"
                subtitle={meta ? meta.total + ' announcements' : 'Loading...'}
                actions={
                    canManage ? (
                        <Button onClick={() => openForm(null)}>
                            <Plus /> New notice
                        </Button>
                    ) : null
                }
            />

            <Card className="mb-4">
                <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="relative lg:col-span-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Title ya content se search"
                            className="pl-9"
                            value={searchInput}
                            onChange={(e) => {
                                setPage(1);
                                setSearchInput(e.target.value);
                            }}
                        />
                    </div>
                    <Select
                        value={categoryFilter}
                        onChange={(e) => {
                            setPage(1);
                            setCategoryFilter(e.target.value);
                        }}
                    >
                        <option value="">All categories</option>
                        {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                                {titleCase(c)}
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
                        <option value="live">Live</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="expired">Expired</option>
                        <option value="draft">Draft</option>
                    </Select>
                </CardContent>
            </Card>

            {loading ? (
                <div className="grid gap-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center text-sm text-muted-foreground">
                        Koi notice nahi mila
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-3">
                    {items.map((n) => (
                        <Card key={n.id} className="transition-shadow hover:shadow-card-hover">
                            <CardContent className="flex flex-wrap items-start gap-4 p-5">
                                <span
                                    className={cn(
                                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                                        n.priority === 'high'
                                            ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                                            : 'bg-accent text-accent-foreground'
                                    )}
                                >
                                    <Megaphone className="h-5 w-5" />
                                </span>

                                <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-medium text-foreground">{n.title}</h3>
                                        <Badge variant={CATEGORY_TONE[n.category] || 'secondary'}>
                                            {titleCase(n.category)}
                                        </Badge>
                                        <Badge variant={STATUS_TONE[n.status] || 'outline'}>
                                            {titleCase(n.status)}
                                        </Badge>
                                        {n.priority !== 'medium' ? (
                                            <Badge variant={PRIORITY_TONE[n.priority]}>
                                                {titleCase(n.priority)}
                                            </Badge>
                                        ) : null}
                                    </div>

                                    <p className="line-clamp-2 text-sm text-muted-foreground">{n.body}</p>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                        <span>
                                            Kiske liye:{' '}
                                            <span className="font-medium text-foreground">
                                                {n.audience === 'class'
                                                    ? (n.schoolClass?.name || 'Class') +
                                                      (n.section ? ' - ' + n.section.name : '')
                                                    : titleCase(n.audience)}
                                            </span>
                                        </span>
                                        <span>Published {formatDate(n.publishOn)}</span>
                                        {n.expiresOn ? <span>Expires {formatDate(n.expiresOn)}</span> : null}
                                        {n.eventDate ? (
                                            <span className="inline-flex items-center gap-1 text-primary">
                                                <CalendarDays className="h-3 w-3" />
                                                {formatDate(n.eventDate)}
                                            </span>
                                        ) : null}
                                        {n.createdBy ? <span>by {n.createdBy.name}</span> : null}
                                    </div>
                                </div>

                                {canManage ? (
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon-sm" title="Edit" onClick={() => openForm(n)}>
                                            <Pencil />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            title="Delete"
                                            className="text-destructive hover:bg-destructive/10"
                                            onClick={() => setDeleting(n)}
                                        >
                                            <Trash2 />
                                        </Button>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Pagination meta={meta} onPage={setPage} />

            <Modal
                open={formOpen}
                onOpenChange={setFormOpen}
                title={editing ? 'Edit notice' : 'New notice'}
                description="Audience decide karta hai kise ye notice dikhegi"
                size="md"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={submit} disabled={saving}>
                            {saving ? 'Saving...' : 'Save notice'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={submit} className="space-y-4">
                    <TextField
                        label="Title"
                        name="title"
                        required
                        placeholder="Annual Sports Day"
                        value={form.title}
                        onChange={set('title')}
                        error={errors.title}
                    />
                    <TextareaField
                        label="Content"
                        name="body"
                        required
                        rows={4}
                        placeholder="Notice ka poora matter"
                        value={form.body}
                        onChange={set('body')}
                        error={errors.body}
                    />

                    <div className="grid gap-4 sm:grid-cols-3">
                        <SelectField label="Category" name="category" value={form.category} onChange={set('category')}>
                            {CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                    {titleCase(c)}
                                </option>
                            ))}
                        </SelectField>
                        <SelectField label="Audience" name="audience" value={form.audience} onChange={set('audience')}>
                            {AUDIENCES.map((a) => (
                                <option key={a} value={a}>
                                    {a === 'class' ? 'Specific class' : titleCase(a)}
                                </option>
                            ))}
                        </SelectField>
                        <SelectField label="Priority" name="priority" value={form.priority} onChange={set('priority')}>
                            {PRIORITIES.map((p) => (
                                <option key={p} value={p}>
                                    {titleCase(p)}
                                </option>
                            ))}
                        </SelectField>
                    </div>

                    {form.audience === 'class' ? (
                        <div className="grid gap-4 rounded-xl border border-border bg-muted/40 p-4 sm:grid-cols-2">
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
                                hint="Khaali = poori class"
                            >
                                <option value="">Poori class</option>
                                {sections.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        Section {s.name}
                                    </option>
                                ))}
                            </SelectField>
                        </div>
                    ) : null}

                    <div className="grid gap-4 sm:grid-cols-3">
                        <TextField
                            label="Publish on"
                            name="publishOn"
                            type="date"
                            required
                            value={form.publishOn}
                            onChange={set('publishOn')}
                            error={errors.publishOn}
                            hint="Aage ki date = scheduled"
                        />
                        <TextField
                            label="Expires on"
                            name="expiresOn"
                            type="date"
                            value={form.expiresOn}
                            onChange={set('expiresOn')}
                            error={errors.expiresOn}
                            hint="Khaali = kabhi nahi"
                        />
                        <TextField
                            label="Event date"
                            name="eventDate"
                            type="date"
                            value={form.eventDate}
                            onChange={set('eventDate')}
                            error={errors.eventDate}
                            hint="Events ke liye"
                        />
                    </div>

                    <label className="flex items-center gap-2.5 text-sm text-foreground">
                        <input
                            type="checkbox"
                            checked={form.isPublished}
                            onChange={set('isPublished')}
                            className="h-4 w-4 rounded border-input accent-[var(--primary)]"
                        />
                        Publish kijiye (uncheck = draft, kisi ko nahi dikhega)
                    </label>

                    <button type="submit" className="hidden" />
                </form>
            </Modal>

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={'Delete "' + (deleting?.title || '') + '"?'}
                message="Ye notice sabke feed se hat jayegi."
                onConfirm={confirmDelete}
            />
        </div>
    );
}
