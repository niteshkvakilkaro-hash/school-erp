import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { formatCurrency, formatDate, toDateInput } from '@/lib/utils';

const FINE_PER_DAY = 2;

/**
 * Do kaam: bahar gayi book wapas lena, ya already-returned book ka
 * baaki fine "paid" mark karna.
 */
export function ReturnModal({ issue, onClose, onSaved }) {
    const [returnedOn, setReturnedOn] = useState(toDateInput(new Date()));
    const [finePaid, setFinePaid] = useState(false);
    const [saving, setSaving] = useState(false);

    const alreadyReturned = issue?.status === 'returned';

    useEffect(() => {
        if (!issue) return;
        setReturnedOn(toDateInput(new Date()));
        setFinePaid(false);
    }, [issue]);

    // Chuni hui return date ke hisaab se preview - server bhi yahi niyam lagata hai
    const previewFine = (() => {
        if (!issue || alreadyReturned) return issue?.fine || 0;
        const late = Math.round((Date.parse(returnedOn) - Date.parse(issue.dueOn)) / 86400000);
        return late > 0 ? late * FINE_PER_DAY : 0;
    })();

    const submit = async (e) => {
        e?.preventDefault();
        setSaving(true);
        try {
            const { data } = alreadyReturned
                ? await api.post('/library/issues/' + issue.id + '/fine-paid')
                : await api.post('/library/issues/' + issue.id + '/return', { returnedOn, finePaid });
            toast.success(data.message);
            onClose();
            onSaved?.();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={Boolean(issue)}
            onOpenChange={(v) => !v && onClose()}
            title={alreadyReturned ? 'Fine paid mark kijiye' : 'Return book'}
            description={issue ? issue.book?.title + ' - ' + (issue.borrower?.name || '') : undefined}
            size="sm"
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={saving}>
                        {saving ? 'Saving...' : alreadyReturned ? 'Mark paid' : 'Return'}
                    </Button>
                </>
            }
        >
            {issue ? (
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl border border-border p-3">
                            <p className="text-xs text-muted-foreground">Issued</p>
                            <p className="font-medium text-foreground">{formatDate(issue.issuedOn)}</p>
                        </div>
                        <div className="rounded-xl border border-border p-3">
                            <p className="text-xs text-muted-foreground">Due</p>
                            <p className="font-medium text-foreground">{formatDate(issue.dueOn)}</p>
                        </div>
                    </div>

                    {!alreadyReturned ? (
                        <TextField
                            label="Return date"
                            name="returnedOn"
                            type="date"
                            value={returnedOn}
                            min={issue.issuedOn}
                            onChange={(e) => setReturnedOn(e.target.value)}
                        />
                    ) : null}

                    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
                        <span className="text-sm text-muted-foreground">Fine</span>
                        <span
                            className={
                                previewFine > 0
                                    ? 'text-lg font-semibold text-destructive'
                                    : 'text-lg font-semibold text-foreground'
                            }
                        >
                            {formatCurrency(previewFine)}
                        </span>
                    </div>

                    {!alreadyReturned && previewFine > 0 ? (
                        <label className="flex items-center gap-2.5 text-sm text-foreground">
                            <input
                                type="checkbox"
                                checked={finePaid}
                                onChange={(e) => setFinePaid(e.target.checked)}
                                className="h-4 w-4 rounded border-input accent-[var(--primary)]"
                            />
                            Fine abhi le liya
                        </label>
                    ) : null}
                    <button type="submit" className="hidden" />
                </form>
            ) : null}
        </Modal>
    );
}
