import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Copy, Check, ShieldCheck, ExternalLink } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TextField } from '@/components/ui/field';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow, LoadingRow } from '@/components/ui/table';
import { cn, formatCurrency } from '@/lib/utils';

const PROVIDERS = [
    ['none', 'Band', 'App me "Pay online" nahi dikhega'],
    ['demo', 'Demo', 'Test ke liye - asli paisa nahi katta'],
    ['razorpay', 'Razorpay', 'UPI, card, netbanking - paisa school ke account me'],
];
const TONE = { paid: 'success', created: 'secondary', failed: 'danger', expired: 'muted' };

function Copyable({ value }) {
    const [done, setDone] = useState(false);
    return (
        <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-2 pl-3">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{value}</span>
            <Button
                size="icon-sm"
                variant="ghost"
                title="Copy"
                onClick={async () => {
                    try {
                        await navigator.clipboard.writeText(value);
                        setDone(true);
                        setTimeout(() => setDone(false), 1500);
                    } catch {
                        toast.error('Copy nahi hua');
                    }
                }}
            >
                {done ? <Check /> : <Copy />}
            </Button>
        </div>
    );
}

export function OnlinePaymentsModal({ open, onClose, canManage }) {
    const [s, setS] = useState(null);
    const [form, setForm] = useState({ provider: 'none', keyId: '', keySecret: '', webhookSecret: '' });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [orders, setOrders] = useState(null);

    const load = useCallback(() => {
        api.get('/fees/online/settings')
            .then(({ data }) => {
                setS(data.data);
                setForm({ provider: data.data.provider, keyId: data.data.keyId || '', keySecret: '', webhookSecret: '' });
            })
            .catch((err) => toast.error(err.message));
        setOrders(null);
        api.get('/fees/online/orders', { params: { limit: 15 } })
            .then(({ data }) => setOrders(data.data))
            .catch(() => setOrders({ items: [], paidToday: 0 }));
    }, []);

    useEffect(() => {
        if (open) load();
    }, [open, load]);

    const save = async () => {
        setSaving(true);
        setErrors({});
        try {
            const body = { provider: form.provider };
            if (form.provider === 'razorpay') {
                body.keyId = form.keyId;
                if (form.keySecret) body.keySecret = form.keySecret;
                if (form.webhookSecret) body.webhookSecret = form.webhookSecret;
            }
            const { data } = await api.put('/fees/online/settings', body);
            toast.success(data.message);
            load();
        } catch (err) {
            setErrors(err.fieldErrors || {});
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    return (
        <Modal open={open} onOpenChange={(v) => !v && onClose()} title="Online fee payment" description="Parents app se fees bharein - receipt apne aap banti hai" size="lg">
            {!s ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Loading...</p>
            ) : (
                <div className="space-y-6">
                    <div className="grid gap-3 sm:grid-cols-3">
                        {PROVIDERS.map(([k, label, hint]) => (
                            <button
                                key={k}
                                type="button"
                                disabled={!canManage}
                                onClick={() => setForm((f) => ({ ...f, provider: k }))}
                                className={cn(
                                    'rounded-xl border p-3 text-left transition-colors',
                                    form.provider === k ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'
                                )}
                            >
                                <span className="flex items-center justify-between font-medium text-foreground">
                                    {label}
                                    {s.provider === k ? <Badge variant={k === 'none' ? 'muted' : 'success'}>Abhi</Badge> : null}
                                </span>
                                <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
                            </button>
                        ))}
                    </div>

                    {form.provider === 'razorpay' ? (
                        <div className="space-y-4 rounded-xl border border-border p-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <TextField label="Key ID" name="keyId" placeholder="rzp_live_xxxxxxxx" value={form.keyId} onChange={set('keyId')} error={errors.keyId} disabled={!canManage} />
                                <TextField
                                    label="Key Secret"
                                    name="keySecret"
                                    type="password"
                                    autoComplete="off"
                                    placeholder={s.keySecretSet ? '•••••• (set hai - badalne ke liye likhiye)' : 'Razorpay dashboard se'}
                                    value={form.keySecret}
                                    onChange={set('keySecret')}
                                    error={errors.keySecret}
                                    disabled={!canManage}
                                />
                                <TextField
                                    label="Webhook Secret"
                                    name="webhookSecret"
                                    type="password"
                                    autoComplete="off"
                                    className="sm:col-span-2"
                                    placeholder={s.webhookSecretSet ? '•••••• (set hai)' : 'Webhook banate waqt jo secret diya'}
                                    value={form.webhookSecret}
                                    onChange={set('webhookSecret')}
                                    disabled={!canManage}
                                    hint="Browser band ho jaye tab bhi payment record ho - isliye webhook zaroor lagaiye"
                                />
                            </div>
                            <div>
                                <p className="mb-1.5 text-sm font-medium text-foreground">Webhook URL (Razorpay → Settings → Webhooks)</p>
                                <Copyable value={s.webhookUrl} />
                                <p className="mt-1.5 text-xs text-muted-foreground">Events: payment.captured, payment.failed, order.paid</p>
                            </div>
                            <p className="flex items-start gap-2 text-xs text-muted-foreground">
                                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                Secret encrypted rehte hain aur dobara kabhi dikhaye nahi jaate. Paisa seedha school ke Razorpay account me jaata hai.
                                <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-primary">
                                    Keys <ExternalLink className="h-3 w-3" />
                                </a>
                            </p>
                        </div>
                    ) : null}

                    {canManage ? (
                        <div className="flex justify-end">
                            <Button onClick={save} disabled={saving}>
                                {saving ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    ) : null}

                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <p className="font-medium text-foreground">Online payments</p>
                            {orders ? <span className="text-sm text-muted-foreground">Aaj {formatCurrency(orders.paidToday)}</span> : null}
                        </div>
                        <TableWrap>
                            <Table>
                                <THead>
                                    <TR>
                                        <TH>Ref</TH>
                                        <TH>Student</TH>
                                        <TH className="text-right">Amount</TH>
                                        <TH>Status</TH>
                                        <TH>Receipt</TH>
                                    </TR>
                                </THead>
                                <TBody>
                                    {!orders ? (
                                        <LoadingRow colSpan={5} />
                                    ) : !orders.items.length ? (
                                        <EmptyRow colSpan={5}>Abhi koi online payment nahi</EmptyRow>
                                    ) : (
                                        orders.items.map((o) => (
                                            <TR key={o.ref}>
                                                <TD>
                                                    <p className="font-mono text-xs text-foreground">{o.ref}</p>
                                                    <p className="text-xs text-muted-foreground">{new Date(o.paidAt || o.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                                </TD>
                                                <TD>
                                                    <p className="text-sm text-foreground">{[o.student?.firstName, o.student?.lastName].filter(Boolean).join(' ')}</p>
                                                    <p className="text-xs text-muted-foreground">{o.student?.admissionNo}</p>
                                                </TD>
                                                <TD className="text-right font-medium text-foreground">{formatCurrency(o.amount)}</TD>
                                                <TD>
                                                    <Badge variant={TONE[o.status]} className="capitalize">
                                                        {o.status}
                                                    </Badge>
                                                    {o.gateway === 'demo' ? <span className="ml-1 text-xs text-muted-foreground">demo</span> : null}
                                                    {o.excess > 0 ? <p className="text-xs text-destructive">Zyada aaya {formatCurrency(o.excess)} - refund</p> : null}
                                                </TD>
                                                <TD className="font-mono text-xs text-muted-foreground">{o.receiptNos.join(', ') || '-'}</TD>
                                            </TR>
                                        ))
                                    )}
                                </TBody>
                            </Table>
                        </TableWrap>
                    </div>
                </div>
            )}
        </Modal>
    );
}
