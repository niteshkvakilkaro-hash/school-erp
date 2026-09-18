import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { TextareaField } from '@/components/ui/field';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow, LoadingRow } from '@/components/ui/table';
import { cn, formatDate } from '@/lib/utils';

const TONE = { pending: 'warning', approved: 'success', rejected: 'danger', cancelled: 'muted' };
const FILTERS = [
    ['pending', 'Pending'],
    ['approved', 'Approved'],
    ['rejected', 'Rejected'],
    ['', 'Sab'],
];

export default function Leaves() {
    const { can, user } = useAuth();
    const canManage = can('hr.manage');
    const [status, setStatus] = useState('pending');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reviewing, setReviewing] = useState(null); // { leave, status }
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        api.get('/hr/leaves', { params: status ? { status } : {} })
            .then(({ data: res }) => setData(res.data))
            .catch((err) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, [status]);

    useEffect(() => {
        load();
    }, [load]);

    const submit = async () => {
        setBusy(true);
        try {
            const { data: res } = await api.post('/hr/leaves/' + reviewing.leave.id + '/review', { status: reviewing.status, note: note || undefined });
            toast.success(res.message);
            setReviewing(null);
            load();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    const items = data?.items || [];
    return (
        <div>
            <PageHeader title="Leaves" subtitle="Staff ki chhutti ki arziyan - app se aati hain" />

            <div className="mb-4 flex flex-wrap gap-2">
                {FILTERS.map(([k, l]) => (
                    <button
                        key={k || 'all'}
                        onClick={() => setStatus(k)}
                        className={cn(
                            'rounded-full border px-3 py-1.5 text-sm font-medium',
                            status === k ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {l}
                        {k === 'pending' && data ? <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 text-xs text-white">{data.pending}</span> : null}
                    </button>
                ))}
            </div>

            <TableWrap>
                <Table>
                    <THead>
                        <TR>
                            <TH>Staff</TH>
                            <TH>Type</TH>
                            <TH>Dates</TH>
                            <TH>Reason</TH>
                            <TH>Status</TH>
                            {canManage ? <TH className="text-right">Action</TH> : null}
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <LoadingRow colSpan={6} />
                        ) : !items.length ? (
                            <EmptyRow colSpan={6}>Koi leave nahi</EmptyRow>
                        ) : (
                            items.map((l) => (
                                <TR key={l.id}>
                                    <TD>
                                        <p className="font-medium text-foreground">{l.user?.name}</p>
                                        <p className="text-xs text-muted-foreground">{l.user?.role?.name}</p>
                                    </TD>
                                    <TD className="capitalize text-muted-foreground">{l.type}</TD>
                                    <TD>
                                        <p className="text-sm text-foreground">
                                            {formatDate(l.fromDate)}
                                            {l.toDate !== l.fromDate ? ' - ' + formatDate(l.toDate) : ''}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{l.days} din</p>
                                    </TD>
                                    <TD className="max-w-xs">
                                        <p className="text-sm text-foreground">{l.reason}</p>
                                        {l.reviewNote ? <p className="text-xs text-muted-foreground">Jawab: {l.reviewNote}</p> : null}
                                    </TD>
                                    <TD>
                                        <Badge variant={TONE[l.status]} className="capitalize">
                                            {l.status}
                                        </Badge>
                                        {l.reviewedBy ? <p className="mt-0.5 text-xs text-muted-foreground">{l.reviewedBy.name}</p> : null}
                                    </TD>
                                    {canManage ? (
                                        <TD>
                                            {l.status === 'pending' && l.userId !== user?.id ? (
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" onClick={() => { setNote(''); setReviewing({ leave: l, status: 'approved' }); }}>
                                                        <Check /> Approve
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => { setNote(''); setReviewing({ leave: l, status: 'rejected' }); }}>
                                                        <X /> Reject
                                                    </Button>
                                                </div>
                                            ) : null}
                                        </TD>
                                    ) : null}
                                </TR>
                            ))
                        )}
                    </TBody>
                </Table>
            </TableWrap>

            <Modal
                open={Boolean(reviewing)}
                onOpenChange={(v) => !v && setReviewing(null)}
                title={reviewing?.status === 'approved' ? 'Leave approve kariye' : 'Leave reject kariye'}
                description={reviewing ? reviewing.leave.user?.name + ' - ' + reviewing.leave.days + ' din (' + reviewing.leave.type + ')' : undefined}
                size="sm"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setReviewing(null)} disabled={busy}>
                            Cancel
                        </Button>
                        <Button onClick={submit} disabled={busy || (reviewing?.status === 'rejected' && note.trim().length < 2)}>
                            {busy ? 'Saving...' : reviewing?.status === 'approved' ? 'Approve' : 'Reject'}
                        </Button>
                    </>
                }
            >
                <TextareaField
                    label={reviewing?.status === 'rejected' ? 'Reason (zaroori)' : 'Note (optional)'}
                    name="reviewNote"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
            </Modal>
        </div>
    );
}
