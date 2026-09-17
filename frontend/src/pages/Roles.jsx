import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ShieldCheck, Lock, Smartphone } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { TextField, TextareaField } from '@/components/ui/field';
import { cn } from '@/lib/utils';

const BLANK = { name: '', description: '', portalOnly: false, permissions: [] };

export default function Roles() {
    const { can, refresh, user } = useAuth();
    const canManage = can('roles.manage');

    const [roles, setRoles] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        Promise.all([api.get('/roles'), api.get('/roles/permissions')])
            .then(([r, p]) => {
                setRoles(r.data.data);
                setCatalog(p.data.data);
            })
            .catch((err) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const openForm = (role) => {
        setEditing(role);
        setErrors({});
        setForm(
            role
                ? {
                      name: role.name,
                      description: role.description || '',
                      portalOnly: role.portalOnly,
                      permissions: role.permissionSlugs || [],
                  }
                : BLANK
        );
        setFormOpen(true);
    };

    const toggle = (slug) =>
        setForm((f) => ({
            ...f,
            permissions: f.permissions.includes(slug)
                ? f.permissions.filter((s) => s !== slug)
                : [...f.permissions, slug],
        }));

    const toggleModule = (group) => {
        const slugs = group.items.map((i) => i.slug);
        const allOn = slugs.every((s) => form.permissions.includes(s));
        setForm((f) => ({
            ...f,
            permissions: allOn
                ? f.permissions.filter((s) => !slugs.includes(s))
                : [...new Set([...f.permissions, ...slugs])],
        }));
    };

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            if (editing) {
                await api.put('/roles/' + editing.id, form);
                toast.success('Role update ho gaya');
                // Apne hi role ki permissions badli ho to sidebar turant refresh ho
                if (editing.id === user?.role?.id) await refresh();
            } else {
                await api.post('/roles', form);
                toast.success('Role ban gaya');
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
            await api.delete('/roles/' + deleting.id);
            toast.success('Role delete ho gaya');
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
                title="Roles & Permissions"
                subtitle="Har role ko sirf utna access dijiye jitna zaroori hai"
                actions={
                    canManage ? (
                        <Button onClick={() => openForm(null)}>
                            <Plus /> Add role
                        </Button>
                    ) : null
                }
            />

            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {roles.map((role) => (
                        <Card key={role.id} className="flex flex-col">
                            <CardContent className="flex flex-1 flex-col gap-3 p-5">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                                            {role.portalOnly ? (
                                                <Smartphone className="h-4 w-4" />
                                            ) : (
                                                <ShieldCheck className="h-4 w-4" />
                                            )}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-foreground">{role.name}</p>
                                            <p className="truncate font-mono text-[11px] text-muted-foreground">
                                                {role.slug}
                                            </p>
                                        </div>
                                    </div>
                                    {role.isSystem ? (
                                        <Badge variant="outline" className="shrink-0 gap-1">
                                            <Lock className="h-3 w-3" /> Default
                                        </Badge>
                                    ) : null}
                                </div>

                                <p className="min-h-10 text-sm text-muted-foreground">
                                    {role.description || 'Koi description nahi'}
                                </p>

                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary">{role.permissionSlugs.length} permissions</Badge>
                                    <Badge variant="muted">{role.userCount} users</Badge>
                                    {role.portalOnly ? <Badge variant="warning">Mobile app</Badge> : null}
                                </div>

                                {canManage ? (
                                    <div className="mt-auto flex gap-2 pt-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => openForm(role)}
                                        >
                                            <Pencil /> Permissions
                                        </Button>
                                        {!role.isSystem ? (
                                            <Button
                                                variant="outline"
                                                size="icon-sm"
                                                className="h-9 w-9 text-destructive hover:bg-destructive/10"
                                                title="Delete"
                                                onClick={() => setDeleting(role)}
                                            >
                                                <Trash2 />
                                            </Button>
                                        ) : null}
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Modal
                open={formOpen}
                onOpenChange={setFormOpen}
                title={editing ? 'Edit ' + editing.name : 'Add role'}
                description={
                    editing?.isSystem
                        ? 'Default role hai - naam fix hai, par permissions badal sakte hain'
                        : 'Role ka naam aur uske permissions chuniye'
                }
                size="lg"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={submit} disabled={saving}>
                            {saving ? 'Saving...' : 'Save role'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={submit} className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                            label="Role name"
                            name="name"
                            required
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            error={errors.name}
                            disabled={editing?.isSystem}
                            hint={editing?.isSystem ? 'Default role ka naam badla nahi ja sakta' : undefined}
                        />
                        <TextareaField
                            label="Description"
                            name="description"
                            rows={2}
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            error={errors.description}
                        />
                    </div>

                    {!editing?.isSystem ? (
                        <label className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm font-medium text-foreground">
                            <input
                                type="checkbox"
                                checked={form.portalOnly}
                                onChange={(e) => setForm((f) => ({ ...f, portalOnly: e.target.checked }))}
                                className="h-4 w-4 rounded border-input accent-[var(--primary)]"
                            />
                            Sirf mobile app ke liye (admin panel me login nahi kar payenge)
                        </label>
                    ) : null}

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Permissions
                            </h4>
                            <Badge variant="secondary">{form.permissions.length} selected</Badge>
                        </div>

                        <div className="space-y-3">
                            {catalog.map((group) => {
                                const slugs = group.items.map((i) => i.slug);
                                const onCount = slugs.filter((s) => form.permissions.includes(s)).length;
                                const allOn = onCount === slugs.length;

                                return (
                                    <div key={group.module} className="rounded-lg border border-border">
                                        <button
                                            type="button"
                                            onClick={() => toggleModule(group)}
                                            className="flex w-full items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5 text-left"
                                        >
                                            <span className="text-sm font-medium text-foreground">
                                                {group.module}
                                            </span>
                                            <span
                                                className={cn(
                                                    'text-xs font-medium',
                                                    allOn ? 'text-primary' : 'text-muted-foreground'
                                                )}
                                            >
                                                {onCount}/{slugs.length} &middot; {allOn ? 'Clear all' : 'Select all'}
                                            </span>
                                        </button>

                                        <div className="grid gap-2 p-4 sm:grid-cols-2">
                                            {group.items.map((item) => (
                                                <label
                                                    key={item.slug}
                                                    className="flex cursor-pointer items-start gap-2.5 text-sm"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={form.permissions.includes(item.slug)}
                                                        onChange={() => toggle(item.slug)}
                                                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-[var(--primary)]"
                                                    />
                                                    <span className="min-w-0">
                                                        <span className="block text-foreground">{item.label}</span>
                                                        <span className="block font-mono text-[11px] text-muted-foreground">
                                                            {item.slug}
                                                        </span>
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <button type="submit" className="hidden" />
                </form>
            </Modal>

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={'Delete ' + (deleting?.name || '') + '?'}
                message="Jis role par users hain wo delete nahi hoga - pehle unhe doosre role me shift kijiye."
                loading={deleteBusy}
                onConfirm={confirmDelete}
            />
        </div>
    );
}
