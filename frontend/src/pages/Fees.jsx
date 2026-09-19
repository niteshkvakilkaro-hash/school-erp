import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search, Wallet, IndianRupee, TrendingUp, AlertCircle, Settings2, Plus, Smartphone, BellRing } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow, LoadingRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { StatCard } from '@/components/dashboard/StatCard';
import { StudentLedger } from '@/components/fees/StudentLedger';
import { FeeHeadsModal } from '@/components/fees/FeeHeadsModal';
import { AssignFeesModal } from '@/components/fees/AssignFeesModal';
import { OnlinePaymentsModal } from '@/components/fees/OnlinePaymentsModal';
import { formatCurrency } from '@/lib/utils';

const STATUS_VARIANT = { paid: 'success', partial: 'warning', pending: 'danger', none: 'muted' };
const STATUS_LABEL = { paid: 'Paid', partial: 'Partial', pending: 'Pending', none: 'No fees' };

export default function Fees() {
    const { can } = useAuth();
    const canManage = can('fees.manage');

    const [summary, setSummary] = useState(null);
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [classes, setClasses] = useState([]);

    const [ledgerFor, setLedgerFor] = useState(null);
    const [headsOpen, setHeadsOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [onlineOpen, setOnlineOpen] = useState(false);
    const [remindOpen, setRemindOpen] = useState(false);
    const [reminding, setReminding] = useState(false);

    const search = useDebounce(searchInput, 400);

    useEffect(() => {
        api.get('/classes/options').then(({ data }) => setClasses(data.data)).catch(() => {});
    }, []);

    const loadSummary = useCallback(() => {
        api.get('/fees/summary')
            .then(({ data }) => setSummary(data.data))
            .catch((err) => toast.error(err.message));
    }, []);

    const loadStudents = useCallback(() => {
        setLoading(true);
        const params = { page, limit: 10 };
        if (search) params.search = search;
        if (classFilter) params.classId = classFilter;
        if (statusFilter) params.status = statusFilter;

        api.get('/fees/students', { params })
            .then(({ data }) => {
                setItems(data.data.items);
                setMeta(data.data.meta);
            })
            .catch((err) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, [page, search, classFilter, statusFilter]);

    useEffect(() => {
        loadSummary();
    }, [loadSummary]);

    useEffect(() => {
        loadStudents();
    }, [loadStudents]);

    // Payment lene ke baad summary aur list dono refresh hone chahiye
    const refreshAll = () => {
        loadSummary();
        loadStudents();
    };

    const sendReminders = async () => {
        setReminding(true);
        try {
            const { data } = await api.post('/fees/reminders', classFilter ? { classId: Number(classFilter) } : {});
            toast.success(data.message);
            setRemindOpen(false);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setReminding(false);
        }
    };
    const filterClassName = classes.find((c) => String(c.id) === String(classFilter))?.name;

    return (
        <div>
            <PageHeader
                title="Fees & Payments"
                subtitle="Dues, collection aur receipts - sab ek jagah"
                actions={
                    <>
                        <Button variant="outline" onClick={() => setOnlineOpen(true)}>
                            <Smartphone /> Online payments
                        </Button>
                        {canManage ? (
                        <>
                            <Button variant="outline" onClick={() => setRemindOpen(true)}>
                                <BellRing /> Reminder bhejiye
                            </Button>
                            <Button variant="outline" onClick={() => setHeadsOpen(true)}>
                                <Settings2 /> Fee heads
                            </Button>
                            <Button onClick={() => setAssignOpen(true)}>
                                <Plus /> Assign fees
                            </Button>
                        </>
                        ) : null}
                    </>
                }
            />

            {/* ---------- Collection summary ---------- */}
            <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    icon={IndianRupee}
                    tone="brand"
                    label="Total fee"
                    value={summary ? formatCurrency(summary.totalFee) : '-'}
                    hint={summary ? summary.percent + '% collect ho chuka' : undefined}
                />
                <StatCard
                    icon={Wallet}
                    tone="blue"
                    label="Collected"
                    value={summary ? formatCurrency(summary.collected) : '-'}
                    hint={summary ? 'Is mahine ' + formatCurrency(summary.collectedThisMonth) : undefined}
                />
                <StatCard
                    icon={AlertCircle}
                    tone="amber"
                    label="Pending"
                    value={summary ? formatCurrency(summary.pending) : '-'}
                    hint={summary ? summary.studentsWithDues + ' students par dues hain' : undefined}
                />
                <StatCard
                    icon={TrendingUp}
                    tone="violet"
                    label="This month"
                    value={summary ? formatCurrency(summary.collectedThisMonth) : '-'}
                    hint={
                        summary
                            ? summary.byMode
                                  .slice(0, 2)
                                  .map((m) => m.mode)
                                  .join(', ') + ' sabse zyada'
                            : undefined
                    }
                />
            </div>

            {/* ---------- Filters ---------- */}
            <Card className="mb-4">
                <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="relative lg:col-span-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Naam, admission no ya roll se search"
                            className="pl-9"
                            value={searchInput}
                            onChange={(e) => {
                                setPage(1);
                                setSearchInput(e.target.value);
                            }}
                        />
                    </div>
                    <Select
                        value={classFilter}
                        onChange={(e) => {
                            setPage(1);
                            setClassFilter(e.target.value);
                        }}
                    >
                        <option value="">All classes</option>
                        {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
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
                        <option value="paid">Paid</option>
                        <option value="partial">Partial</option>
                        <option value="pending">Pending</option>
                    </Select>
                </CardContent>
            </Card>

            <TableWrap>
                <Table>
                    <THead>
                        <TR>
                            <TH>Student</TH>
                            <TH>Class</TH>
                            <TH className="text-right">Total fee</TH>
                            <TH className="text-right">Paid</TH>
                            <TH className="text-right">Pending</TH>
                            <TH>Status</TH>
                            <TH className="text-right">Actions</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <LoadingRow colSpan={7} />
                        ) : items.length === 0 ? (
                            <EmptyRow colSpan={7}>Is filter par koi student nahi mila</EmptyRow>
                        ) : (
                            items.map((s) => (
                                <TR key={s.id}>
                                    <TD>
                                        <p className="font-medium text-foreground">{s.name}</p>
                                        <p className="font-mono text-xs text-muted-foreground">
                                            {s.admissionNo}
                                        </p>
                                    </TD>
                                    <TD>
                                        <Badge variant="secondary">
                                            {s.className || '-'}
                                            {s.sectionName ? ' - ' + s.sectionName : ''}
                                        </Badge>
                                    </TD>
                                    <TD className="text-right font-medium">{formatCurrency(s.totalFee)}</TD>
                                    <TD className="text-right text-brand-700 dark:text-brand-300">
                                        {formatCurrency(s.paid)}
                                    </TD>
                                    <TD
                                        className={
                                            s.pending > 0
                                                ? 'text-right font-semibold text-destructive'
                                                : 'text-right text-muted-foreground'
                                        }
                                    >
                                        {formatCurrency(s.pending)}
                                    </TD>
                                    <TD>
                                        <Badge variant={STATUS_VARIANT[s.status] || 'outline'}>
                                            {STATUS_LABEL[s.status] || s.status}
                                        </Badge>
                                    </TD>
                                    <TD>
                                        <div className="flex justify-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setLedgerFor(s.id)}
                                            >
                                                Ledger
                                            </Button>
                                        </div>
                                    </TD>
                                </TR>
                            ))
                        )}
                    </TBody>
                </Table>
            </TableWrap>

            <Pagination meta={meta} onPage={setPage} />

            <StudentLedger
                studentId={ledgerFor}
                onClose={() => setLedgerFor(null)}
                onChanged={refreshAll}
            />

            <FeeHeadsModal open={headsOpen} onOpenChange={setHeadsOpen} onChanged={refreshAll} />

            <OnlinePaymentsModal open={onlineOpen} onClose={() => { setOnlineOpen(false); refreshAll(); }} canManage={canManage} />
            <Modal
                open={remindOpen}
                onOpenChange={setRemindOpen}
                title="Fees reminder"
                description={'Jinki fees baaki hai unke parents ko SMS / WhatsApp - ' + (filterClassName ? 'sirf ' + filterClassName : 'saari classes')}
                size="sm"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setRemindOpen(false)} disabled={reminding}>
                            Cancel
                        </Button>
                        <Button onClick={sendReminders} disabled={reminding}>
                            <BellRing /> {reminding ? 'Bhej rahe hain...' : 'Bhejiye'}
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-muted-foreground">
                    Har parent ko baaki rakam ke saath ek message jayega. Ek din me ek student ko ek hi reminder jata hai - dobara dabane par double nahi hoga.
                    {filterClassName ? null : ' Kisi ek class ko bhejna ho to pehle upar class filter chuniye.'}
                </p>
            </Modal>
            <AssignFeesModal
                open={assignOpen}
                onOpenChange={setAssignOpen}
                classes={classes}
                onChanged={refreshAll}
            />
        </div>
    );
}
