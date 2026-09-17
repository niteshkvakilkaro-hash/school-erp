import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Save, Building2, Users, GraduationCap, CreditCard } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TextField, TextareaField } from '@/components/ui/field';
import { formatCurrency, formatDate } from '@/lib/utils';

const BLANK = {
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    website: '',
    session: '',
};

/** Usage bar - plan limit ke against kitna use hua. 0 limit = unlimited. */
function UsageBar({ icon: Icon, label, used, max }) {
    const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
    const near = max > 0 && pct >= 85;

    return (
        <div className="space-y-2 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Icon className="h-4 w-4 text-muted-foreground" /> {label}
                </span>
                <span className="text-sm text-muted-foreground">
                    {used} / {max > 0 ? max : 'Unlimited'}
                </span>
            </div>
            {max > 0 ? (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                        className={near ? 'h-full rounded-full bg-destructive' : 'h-full rounded-full bg-primary'}
                        style={{ width: pct + '%' }}
                    />
                </div>
            ) : null}
            {near ? <p className="text-xs text-destructive">Limit ke kareeb - plan upgrade kijiye</p> : null}
        </div>
    );
}

export default function SchoolSettings() {
    const { can, refresh } = useAuth();
    const canEdit = can('school.settings.update');

    const [data, setData] = useState(null);
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get('/school')
            .then(({ data: res }) => {
                setData(res.data);
                const s = res.data.school;
                setForm({
                    name: s.name || '',
                    email: s.email || '',
                    phone: s.phone || '',
                    address: s.address || '',
                    city: s.city || '',
                    state: s.state || '',
                    pincode: s.pincode || '',
                    website: s.website || '',
                    session: s.session || '',
                });
            })
            .catch((err) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, []);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            await api.put('/school', form);
            toast.success('Settings save ho gayi');
            // Sidebar me school ka naam turant update ho jaye
            await refresh();
        } catch (err) {
            setErrors(err.fieldErrors || {});
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="h-96 animate-pulse rounded-lg bg-muted" />;
    }

    const school = data?.school;
    const usage = data?.usage || {};
    const subscription = data?.subscription;

    return (
        <div>
            <PageHeader
                title="School settings"
                subtitle={school?.code + ' - profile aur subscription'}
                actions={
                    canEdit ? (
                        <Button onClick={submit} disabled={saving}>
                            <Save /> {saving ? 'Saving...' : 'Save changes'}
                        </Button>
                    ) : null
                }
            />

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>School profile</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                            <TextField
                                label="School name"
                                name="name"
                                required
                                value={form.name}
                                onChange={set('name')}
                                error={errors.name}
                                disabled={!canEdit}
                                className="sm:col-span-2"
                            />
                            <TextField label="Email" name="email" type="email" value={form.email} onChange={set('email')} error={errors.email} disabled={!canEdit} />
                            <TextField label="Phone" name="phone" value={form.phone} onChange={set('phone')} error={errors.phone} disabled={!canEdit} />
                            <TextField label="Website" name="website" value={form.website} onChange={set('website')} error={errors.website} disabled={!canEdit} />
                            <TextField label="Academic session" name="session" placeholder="2026-27" value={form.session} onChange={set('session')} error={errors.session} disabled={!canEdit} />
                            <TextField label="City" name="city" value={form.city} onChange={set('city')} error={errors.city} disabled={!canEdit} />
                            <TextField label="State" name="state" value={form.state} onChange={set('state')} error={errors.state} disabled={!canEdit} />
                            <TextField label="Pincode" name="pincode" value={form.pincode} onChange={set('pincode')} error={errors.pincode} disabled={!canEdit} />
                            <TextareaField
                                label="Address"
                                name="address"
                                rows={2}
                                className="sm:col-span-2"
                                value={form.address}
                                onChange={set('address')}
                                error={errors.address}
                                disabled={!canEdit}
                            />
                            <button type="submit" className="hidden" />
                        </form>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Subscription</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {subscription?.plan ? (
                                <>
                                    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4">
                                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                            <CreditCard className="h-5 w-5" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-foreground">
                                                {subscription.plan.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatCurrency(subscription.plan.pricePerMonth)} / month
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Valid till</span>
                                            <span className="text-foreground">{formatDate(subscription.endsOn)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">School status</span>
                                            <Badge
                                                variant={
                                                    school?.status === 'active'
                                                        ? 'success'
                                                        : school?.status === 'trial'
                                                          ? 'warning'
                                                          : 'danger'
                                                }
                                                className="capitalize"
                                            >
                                                {school?.status}
                                            </Badge>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p className="py-4 text-center text-sm text-muted-foreground">
                                    Koi active plan nahi - platform admin se baat kijiye
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Plan usage</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <UsageBar icon={GraduationCap} label="Students" used={usage.students || 0} max={usage.maxStudents || 0} />
                            <UsageBar icon={Users} label="Teachers" used={usage.teachers || 0} max={usage.maxTeachers || 0} />
                            <div className="flex items-center gap-2 rounded-lg border border-border p-4 text-sm">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">School code</span>
                                <span className="ml-auto font-mono text-foreground">{school?.code}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
