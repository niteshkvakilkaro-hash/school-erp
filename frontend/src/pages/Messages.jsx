import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Send, ShieldCheck, Search, MessageSquareText, CheckCircle2, XCircle, Clock3, MinusCircle } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Select } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TextField } from '@/components/ui/field';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow, LoadingRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatCard } from '@/components/dashboard/StatCard';
import { cn } from '@/lib/utils';

const PROVIDERS = [
    ['none', 'Band', 'Koi message nahi jayega'],
    ['demo', 'Demo', 'Sirf record banta hai - asli SMS nahi'],
    ['msg91', 'SMS (MSG91)', 'DLT approved templates se SMS'],
    ['whatsapp', 'WhatsApp', 'Meta WhatsApp Cloud API templates'],
];
const TONE = { sent: 'success', queued: 'secondary', failed: 'danger', skipped: 'muted' };
const EVENT_SHORT = { absent: 'Absent', feeReceipt: 'Receipt', feeReminder: 'Reminder', leaveDecision: 'Leave', test: 'Test' };

function Settings({ s, canManage, onSaved }) {
    const [form, setForm] = useState(() => ({ provider: s.provider, apiKey: '', senderId: s.senderId || '', events: { ...s.events }, templates: { ...s.templates } }));
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [phone, setPhone] = useState('');
    const [testing, setTesting] = useState(false);
    const live = form.provider === 'msg91' || form.provider === 'whatsapp';

    const save = async () => {
        setSaving(true);
        setErrors({});
        try {
            const body = { provider: form.provider, events: form.events };
            if (live) {
                body.senderId = form.senderId;
                body.templates = form.templates;
                if (form.apiKey) body.apiKey = form.apiKey;
            }
            const { data } = await api.put('/messages/settings', body);
            toast.success(data.message);
            onSaved();
        } catch (err) {
            setErrors(err.fieldErrors || {});
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const test = async () => {
        setTesting(true);
        try {
            const { data } = await api.post('/messages/test', { phone });
            toast.success(data.message);
            onSaved();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setTesting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Setup</CardTitle>
                <CardDescription>Kaunse kaam par parents / staff ko message jaye</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {PROVIDERS.map(([k, label, hint]) => (
                        <button
                            key={k}
                            type="button"
                            disabled={!canManage}
                            onClick={() => setForm((f) => ({ ...f, provider: k }))}
                            className={cn('rounded-xl border p-3 text-left transition-colors', form.provider === k ? 'border-primary bg-accent' : 'border-border hover:border-primary/50')}
                        >
                            <span className="flex items-center justify-between font-medium text-foreground">
                                {label}
                                {s.provider === k ? <Badge variant={k === 'none' ? 'muted' : 'success'}>Abhi</Badge> : null}
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
                        </button>
                    ))}
                </div>

                {live ? (
                    <div className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
                        <TextField
                            label={form.provider === 'msg91' ? 'MSG91 Authkey' : 'Access token'}
                            name="apiKey"
                            type="password"
                            autoComplete="off"
                            placeholder={s.apiKeySet ? s.apiKeyHint + ' (set hai - badalne ke liye likhiye)' : 'Provider dashboard se'}
                            value={form.apiKey}
                            onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                            error={errors.apiKey}
                            disabled={!canManage}
                        />
                        <TextField
                            label={form.provider === 'msg91' ? 'Sender ID (optional)' : 'Phone number ID'}
                            name="senderId"
                            placeholder={form.provider === 'msg91' ? 'SCHOOL' : '1234567890123'}
                            value={form.senderId}
                            onChange={(e) => setForm((f) => ({ ...f, senderId: e.target.value }))}
                            error={errors.senderId}
                            disabled={!canManage}
                        />
                        <p className="flex items-start gap-2 text-xs text-muted-foreground sm:col-span-2">
                            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            Key encrypted rehti hai. Har event ke liye provider par template approve karwaiye - variables neeche diye kram me.
                        </p>
                    </div>
                ) : null}

                <div className="divide-y divide-border rounded-xl border border-border">
                    {s.catalog.map((c) => {
                        const isTest = c.key === 'test';
                        if (isTest && !live) return null;
                        return (
                            <div key={c.key} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        {!isTest ? (
                                            <input
                                                type="checkbox"
                                                id={'ev-' + c.key}
                                                className="h-4 w-4 accent-[hsl(var(--primary))]"
                                                checked={Boolean(form.events[c.key])}
                                                disabled={!canManage}
                                                onChange={(e) => setForm((f) => ({ ...f, events: { ...f.events, [c.key]: e.target.checked } }))}
                                            />
                                        ) : null}
                                        <label htmlFor={'ev-' + c.key} className="font-medium text-foreground">
                                            {c.label}
                                        </label>
                                    </div>
                                    <p className="mt-1 text-sm text-muted-foreground">{c.text}</p>
                                    {live ? (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Variables: {c.vars.map((v, i) => (form.provider === 'msg91' ? '##var' + (i + 1) + '## = ' + v : '{{' + (i + 1) + '}} = ' + v)).join(', ')}
                                        </p>
                                    ) : null}
                                </div>
                                {live ? (
                                    <Input
                                        className="lg:w-64"
                                        aria-label={c.label + ' template'}
                                        placeholder={form.provider === 'msg91' ? 'Template ID' : 'Template name'}
                                        value={form.templates[c.key] || ''}
                                        disabled={!canManage}
                                        onChange={(e) => setForm((f) => ({ ...f, templates: { ...f.templates, [c.key]: e.target.value } }))}
                                    />
                                ) : null}
                            </div>
                        );
                    })}
                </div>

                {canManage ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex items-end gap-2">
                            <TextField label="Test number" name="testPhone" placeholder="98xxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-48" />
                            <Button variant="outline" onClick={test} disabled={testing || s.provider === 'none' || phone.replace(/\D/g, '').length < 10}>
                                <Send /> {testing ? 'Bhej rahe...' : 'Test'}
                            </Button>
                        </div>
                        <Button onClick={save} disabled={saving}>
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}

export default function Messages() {
    const { can } = useAuth();
    const canManage = can('messages.manage');
    const [s, setS] = useState(null);
    const [logs, setLogs] = useState(null);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('');
    const [event, setEvent] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const search = useDebounce(searchInput, 400);

    const loadSettings = useCallback(() => {
        api.get('/messages/settings')
            .then(({ data }) => setS(data.data))
            .catch((err) => toast.error(err.message));
    }, []);

    const loadLogs = useCallback(() => {
        const params = { page, limit: 15 };
        if (status) params.status = status;
        if (event) params.event = event;
        if (search) params.search = search;
        api.get('/messages/logs', { params })
            .then(({ data }) => setLogs(data.data))
            .catch((err) => toast.error(err.message));
    }, [page, status, event, search]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);
    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const t = logs?.today;
    return (
        <div>
            <PageHeader title="SMS / WhatsApp" subtitle="Absent, fees receipt, reminder aur leave ke message apne aap" />

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={CheckCircle2} tone="brand" label="Aaj gaye" value={t ? t.sent : '-'} />
                <StatCard icon={Clock3} tone="blue" label="Line me" value={t ? t.queued : '-'} />
                <StatCard icon={XCircle} tone="amber" label="Fail" value={t ? t.failed : '-'} />
                <StatCard icon={MinusCircle} tone="violet" label="Ruke (number galat)" value={t ? t.skipped : '-'} />
            </div>

            {s ? <Settings key={JSON.stringify(s)} s={s} canManage={canManage} onSaved={() => { loadSettings(); loadLogs(); }} /> : <p className="py-10 text-center text-sm text-muted-foreground">Loading...</p>}

            <div className="mb-3 mt-8 flex flex-wrap items-center gap-3">
                <h2 className="mr-auto flex items-center gap-2 text-lg font-semibold text-foreground">
                    <MessageSquareText className="h-5 w-5 text-primary" /> Bheje gaye message
                </h2>
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="w-56 pl-9" placeholder="Number ya naam" value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setPage(1); }} />
                </div>
                <Select aria-label="Event" className="w-40" value={event} onChange={(e) => { setEvent(e.target.value); setPage(1); }}>
                    <option value="">Sab events</option>
                    {Object.entries(EVENT_SHORT).map(([k, l]) => (
                        <option key={k} value={k}>
                            {l}
                        </option>
                    ))}
                </Select>
                <Select aria-label="Status" className="w-36" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                    <option value="">Sab status</option>
                    {Object.keys(TONE).map((k) => (
                        <option key={k} value={k} className="capitalize">
                            {k}
                        </option>
                    ))}
                </Select>
            </div>

            <TableWrap>
                <Table>
                    <THead>
                        <TR>
                            <TH>Kab</TH>
                            <TH>Event</TH>
                            <TH>Number</TH>
                            <TH>Message</TH>
                            <TH>Status</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {!logs ? (
                            <LoadingRow colSpan={5} />
                        ) : !logs.items.length ? (
                            <EmptyRow colSpan={5}>Abhi koi message nahi gaya</EmptyRow>
                        ) : (
                            logs.items.map((m) => (
                                <TR key={m.id}>
                                    <TD className="whitespace-nowrap text-xs text-muted-foreground">
                                        {new Date(m.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </TD>
                                    <TD>
                                        <Badge variant="secondary">{EVENT_SHORT[m.event] || m.event}</Badge>
                                        <p className="mt-0.5 text-xs uppercase text-muted-foreground">{m.channel}</p>
                                    </TD>
                                    <TD className="font-mono text-xs text-foreground">{m.toPhone || '-'}</TD>
                                    <TD className="max-w-md text-sm text-foreground">{m.body}</TD>
                                    <TD>
                                        <Badge variant={TONE[m.status]} className="capitalize">
                                            {m.status}
                                        </Badge>
                                        {m.error ? <p className="mt-0.5 max-w-[14rem] text-xs text-destructive">{m.error}</p> : null}
                                    </TD>
                                </TR>
                            ))
                        )}
                    </TBody>
                </Table>
            </TableWrap>
            <Pagination meta={logs?.meta} onPage={setPage} />
        </div>
    );
}
