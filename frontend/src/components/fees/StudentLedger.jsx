import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Receipt, Wallet, Trash2, ClipboardList } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TextField, SelectField } from '@/components/ui/field';
import { formatCurrency, formatDate, toDateInput, cn, titleCase } from '@/lib/utils';

const MODES = ['cash', 'upi', 'card', 'netbanking', 'cheque', 'dd'];
const LINE_VARIANT = { paid: 'success', partial: 'warning', pending: 'danger', waived: 'muted' };

const BLANK = { amount: '', mode: 'cash', reference: '', paidOn: toDateInput(new Date()), remarks: '' };

export function StudentLedger({ studentId, onClose, onChanged }) {
    const { can } = useAuth();
    const canCollect = can('fees.collect');

    const [tab, setTab] = useState('fees');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Kis fee line ka payment liya ja raha hai
    const [payFor, setPayFor] = useState(null);
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);

    const load = useCallback(() => {
        if (!studentId) return;
        setLoading(true);
        api.get('/fees/students/' + studentId)
            .then(({ data: res }) => setData(res.data))
            .catch((err) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, [studentId]);

    useEffect(() => {
        if (!studentId) {
            setData(null);
            setTab('fees');
            setPayFor(null);
            return;
        }
        load();
    }, [studentId, load]);

    const openPay = (line) => {
        setPayFor(line);
        setErrors({});
        // Default me poora pending amount bhar dete hain
        setForm({ ...BLANK, amount: String(line.pending) });
    };

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submitPayment = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            const { data: res } = await api.post('/fees/payments', {
                studentFeeId: payFor.id,
                amount: form.amount,
                mode: form.mode,
                reference: form.reference || undefined,
                paidOn: form.paidOn,
                remarks: form.remarks || undefined,
            });
            toast.success(res.message);
            setPayFor(null);
            load();
            onChanged?.();
        } catch (err) {
            setErrors(err.fieldErrors || {});
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        try {
            await api.delete('/fees/payments/' + deleting.id);
            toast.success('Payment cancel ho gaya');
            setDeleting(null);
            load();
            onChanged?.();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const s = data?.summary;
    const TABS = [
        { key: 'fees', label: 'Fee details', icon: ClipboardList },
        { key: 'payments', label: 'Payment history', icon: Receipt },
    ];

    return (
        <>
            <Modal
                open={Boolean(studentId)}
                onOpenChange={(v) => !v && onClose()}
                title={data?.student?.name || 'Student fees'}
                description={
                    data?.student
                        ? data.student.admissionNo +
                          ' - ' +
                          (data.student.className || 'Unassigned') +
                          (data.student.sectionName ? ' ' + data.student.sectionName : '')
                        : undefined
                }
                size="lg"
            >
                {loading ? (
                    <div className="h-64 animate-pulse rounded-lg bg-muted" />
                ) : !data ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">Koi data nahi mila</p>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-xl border border-border p-3">
                                <p className="text-xs text-muted-foreground">Total fee</p>
                                <p className="text-lg font-semibold text-foreground">
                                    {formatCurrency(s.totalFee)}
                                </p>
                            </div>
                            <div className="rounded-xl border border-border p-3">
                                <p className="text-xs text-muted-foreground">Paid</p>
                                <p className="text-lg font-semibold text-brand-700 dark:text-brand-300">
                                    {formatCurrency(s.paid)}
                                </p>
                            </div>
                            <div className="rounded-xl border border-border p-3">
                                <p className="text-xs text-muted-foreground">Pending</p>
                                <p
                                    className={cn(
                                        'text-lg font-semibold',
                                        s.pending > 0 ? 'text-destructive' : 'text-muted-foreground'
                                    )}
                                >
                                    {formatCurrency(s.pending)}
                                </p>
                            </div>
                        </div>

                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: s.percent + '%' }}
                            />
                        </div>

                        <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
                            {TABS.map(({ key, label, icon: Icon }) => (
                                <button
                                    key={key}
                                    onClick={() => setTab(key)}
                                    className={cn(
                                        'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                        tab === key
                                            ? 'bg-card text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    <Icon className="h-4 w-4" /> {label}
                                </button>
                            ))}
                        </div>

                        {tab === 'fees' ? (
                            <TableWrap>
                                <Table>
                                    <THead>
                                        <TR>
                                            <TH>Fee head</TH>
                                            <TH className="text-right">Amount</TH>
                                            <TH className="text-right">Paid</TH>
                                            <TH className="text-right">Pending</TH>
                                            <TH>Status</TH>
                                            {canCollect ? <TH className="text-right">Action</TH> : null}
                                        </TR>
                                    </THead>
                                    <TBody>
                                        {data.lines.length === 0 ? (
                                            <EmptyRow colSpan={canCollect ? 6 : 5}>
                                                Is student par abhi koi fee nahi lagi
                                            </EmptyRow>
                                        ) : (
                                            data.lines.map((l) => (
                                                <TR key={l.id}>
                                                    <TD>
                                                        <p className="font-medium text-foreground">{l.feeHead}</p>
                                                        {l.dueDate ? (
                                                            <p className="text-xs text-muted-foreground">
                                                                Due {formatDate(l.dueDate)}
                                                            </p>
                                                        ) : null}
                                                    </TD>
                                                    <TD className="text-right">{formatCurrency(l.payable)}</TD>
                                                    <TD className="text-right text-brand-700 dark:text-brand-300">
                                                        {formatCurrency(l.paid)}
                                                    </TD>
                                                    <TD
                                                        className={cn(
                                                            'text-right',
                                                            l.pending > 0
                                                                ? 'font-semibold text-destructive'
                                                                : 'text-muted-foreground'
                                                        )}
                                                    >
                                                        {formatCurrency(l.pending)}
                                                    </TD>
                                                    <TD>
                                                        <Badge variant={LINE_VARIANT[l.status] || 'outline'}>
                                                            {titleCase(l.status)}
                                                        </Badge>
                                                    </TD>
                                                    {canCollect ? (
                                                        <TD>
                                                            <div className="flex justify-end">
                                                                <Button
                                                                    size="sm"
                                                                    disabled={l.pending <= 0}
                                                                    onClick={() => openPay(l)}
                                                                >
                                                                    <Wallet /> Collect
                                                                </Button>
                                                            </div>
                                                        </TD>
                                                    ) : null}
                                                </TR>
                                            ))
                                        )}
                                    </TBody>
                                </Table>
                            </TableWrap>
                        ) : null}

                        {tab === 'payments' ? (
                            <TableWrap>
                                <Table>
                                    <THead>
                                        <TR>
                                            <TH>Receipt</TH>
                                            <TH>Fee head</TH>
                                            <TH className="text-right">Amount</TH>
                                            <TH>Mode</TH>
                                            <TH>Date</TH>
                                            {canCollect ? <TH className="text-right">Action</TH> : null}
                                        </TR>
                                    </THead>
                                    <TBody>
                                        {data.payments.length === 0 ? (
                                            <EmptyRow colSpan={canCollect ? 6 : 5}>
                                                Abhi koi payment nahi hua
                                            </EmptyRow>
                                        ) : (
                                            data.payments.map((p) => (
                                                <TR key={p.id}>
                                                    <TD className="font-mono text-xs">{p.receiptNo}</TD>
                                                    <TD>{p.feeHead}</TD>
                                                    <TD className="text-right font-medium">
                                                        {formatCurrency(p.amount)}
                                                    </TD>
                                                    <TD>
                                                        <Badge variant="secondary" className="uppercase">
                                                            {p.mode}
                                                        </Badge>
                                                    </TD>
                                                    <TD className="text-muted-foreground">
                                                        {formatDate(p.paidOn)}
                                                        {p.collectedBy ? (
                                                            <span className="block text-xs">by {p.collectedBy}</span>
                                                        ) : null}
                                                    </TD>
                                                    {canCollect ? (
                                                        <TD>
                                                            <div className="flex justify-end">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon-sm"
                                                                    title="Payment cancel kijiye"
                                                                    className="text-destructive hover:bg-destructive/10"
                                                                    onClick={() => setDeleting(p)}
                                                                >
                                                                    <Trash2 />
                                                                </Button>
                                                            </div>
                                                        </TD>
                                                    ) : null}
                                                </TR>
                                            ))
                                        )}
                                    </TBody>
                                </Table>
                            </TableWrap>
                        ) : null}
                    </div>
                )}
            </Modal>

            {/* ---------- Payment collect ---------- */}
            <Modal
                open={Boolean(payFor)}
                onOpenChange={(v) => !v && setPayFor(null)}
                title="Collect payment"
                description={payFor ? payFor.feeHead + ' - pending ' + formatCurrency(payFor.pending) : undefined}
                size="sm"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setPayFor(null)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={submitPayment} disabled={saving}>
                            {saving ? 'Saving...' : 'Record payment'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={submitPayment} className="space-y-4">
                    <TextField
                        label="Amount"
                        name="amount"
                        type="number"
                        min="1"
                        max={payFor?.pending}
                        step="0.01"
                        required
                        value={form.amount}
                        onChange={set('amount')}
                        error={errors.amount}
                        hint={payFor ? 'Zyada se zyada ' + formatCurrency(payFor.pending) : undefined}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <SelectField label="Mode" name="mode" value={form.mode} onChange={set('mode')}>
                            {MODES.map((m) => (
                                <option key={m} value={m}>
                                    {m.toUpperCase()}
                                </option>
                            ))}
                        </SelectField>
                        <TextField
                            label="Paid on"
                            name="paidOn"
                            type="date"
                            value={form.paidOn}
                            onChange={set('paidOn')}
                            error={errors.paidOn}
                        />
                    </div>
                    <TextField
                        label="Reference"
                        name="reference"
                        placeholder="Cheque no / UPI txn id"
                        value={form.reference}
                        onChange={set('reference')}
                        error={errors.reference}
                    />
                    <TextField
                        label="Remarks"
                        name="remarks"
                        value={form.remarks}
                        onChange={set('remarks')}
                        error={errors.remarks}
                    />
                    <button type="submit" className="hidden" />
                </form>
            </Modal>

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={'Cancel receipt ' + (deleting?.receiptNo || '') + '?'}
                message={
                    'Receipt hat jayegi aur ' +
                    formatCurrency(deleting?.amount || 0) +
                    ' wapas pending me chala jayega.'
                }
                onConfirm={confirmDelete}
            />
        </>
    );
}
