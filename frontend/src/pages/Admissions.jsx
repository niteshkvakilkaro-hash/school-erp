import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Inbox, Hourglass, UserCheck, BellRing, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useNewParam } from '@/hooks/useNewParam';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow, LoadingRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { StatCard } from '@/components/dashboard/StatCard';
import { AdmissionModal } from '@/components/admissions/AdmissionModal';
import { AdmissionDetail } from '@/components/admissions/AdmissionDetail';
import { AdmitModal } from '@/components/admissions/AdmitModal';
import { STAGES, PIPELINE, CLOSED, SOURCES, formatDateTime, ageFrom } from '@/components/admissions/stages';
import { cn, formatDate, titleCase } from '@/lib/utils';

export default function Admissions() {
    const { can } = useAuth();
    const canManage = can('admissions.manage');
    const canAdmit = can('admissions.admit');

    const [summary, setSummary] = useState(null);
    const [classes, setClasses] = useState([]);
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('open');
    const [classId, setClassId] = useState('');
    const [source, setSource] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const search = useDebounce(searchInput, 400);

    const [form, setForm] = useState(null);
    const [detailId, setDetailId] = useState(null);
    const [admitting, setAdmitting] = useState(null);
    const [deleting, setDeleting] = useState(null);

    const loadSummary = useCallback(() => {
        api.get('/admissions/summary').then(({ data }) => setSummary(data.data)).catch(() => {});
    }, []);

    const load = useCallback(() => {
        setLoading(true);
        const params = { page, limit: 12 };
        if (status === 'due') params.followUp = 'due';
        else if (status) params.status = status;
        if (classId) params.classId = classId;
        if (source) params.source = source;
        if (search) params.search = search;
        api.get('/admissions', { params })
            .then(({ data }) => {
                setItems(data.data.items);
                setMeta(data.data.meta);
            })
            .catch((err) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, [page, status, classId, source, search]);

    useEffect(() => {
        loadSummary();
        api.get('/classes/options').then(({ data }) => setClasses(data.data)).catch(() => {});
    }, [loadSummary]);

    useEffect(() => {
        load();
    }, [load]);

    useNewParam(() => {
        if (canManage) setForm({});
    });

    const refresh = () => {
        loadSummary();
        load();
    };

    const pick = (s) => {
        setPage(1);
        setStatus(s);
    };

    const confirmDelete = async () => {
        try {
            const { data } = await api.delete('/admissions/' + deleting.id);
            toast.success(data.message);
            setDeleting(null);
            setDetailId(null);
            refresh();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const c = summary?.counts;

    return (
        <div>
            <PageHeader
                title="Admissions"
                subtitle="Enquiry se admission tak - follow-up, interview aur approval ek jagah"
                actions={
                    canManage ? (
                        <Button onClick={() => setForm({})}>
                            <Plus /> New enquiry
                        </Button>
                    ) : null
                }
            />

            <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    icon={Inbox}
                    tone="brand"
                    label="Enquiries is mahine"
                    value={summary ? summary.thisMonth : '-'}
                    hint={summary ? summary.total + ' kul applications' : undefined}
                />
                <StatCard
                    icon={Hourglass}
                    tone="blue"
                    label="Process me"
                    value={summary ? summary.open : '-'}
                    hint={summary ? summary.interviewsToday + ' interview aaj' : undefined}
                />
                <StatCard
                    icon={BellRing}
                    tone="amber"
                    label="Follow-up due"
                    value={summary ? summary.followUpsDue : '-'}
                    hint="Aaj ya pehle ke - call kijiye"
                />
                <StatCard
                    icon={UserCheck}
                    tone="violet"
                    label="Conversion"
                    value={summary ? summary.conversion + '%' : '-'}
                    hint={summary ? (c?.admitted || 0) + ' admitted, ' + summary.admittedThisMonth + ' is mahine' : undefined}
                />
            </div>

            {/* Pipeline - har stage par click karke filter */}
            <Card className="mb-4">
                <CardContent className="p-3">
                    <div className="flex flex-wrap items-stretch gap-1">
                        {PIPELINE.map((s, i) => (
                            <div key={s} className="flex items-center">
                                <button
                                    onClick={() => pick(s)}
                                    className={cn(
                                        'min-w-[92px] rounded-lg px-3 py-2 text-left transition-colors',
                                        status === s ? 'bg-accent' : 'hover:bg-muted'
                                    )}
                                >
                                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <span className={cn('h-2 w-2 rounded-full', STAGES[s].dot)} /> {STAGES[s].label}
                                    </span>
                                    <span className="block text-lg font-semibold text-foreground">{c ? c[s] : '-'}</span>
                                </button>
                                {i < PIPELINE.length - 1 ? <ChevronRight className="h-4 w-4 text-muted-foreground/60" /> : null}
                            </div>
                        ))}
                        <div className="mx-2 hidden w-px self-stretch bg-border sm:block" />
                        {CLOSED.map((s) => (
                            <button
                                key={s}
                                onClick={() => pick(s)}
                                className={cn(
                                    'min-w-[92px] rounded-lg px-3 py-2 text-left transition-colors',
                                    status === s ? 'bg-accent' : 'hover:bg-muted'
                                )}
                            >
                                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <span className={cn('h-2 w-2 rounded-full', STAGES[s].dot)} /> {STAGES[s].label}
                                </span>
                                <span className="block text-lg font-semibold text-foreground">{c ? c[s] : '-'}</span>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="mb-4">
                <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="relative lg:col-span-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Naam, phone ya ENQ number"
                            className="pl-9"
                            value={searchInput}
                            onChange={(e) => {
                                setPage(1);
                                setSearchInput(e.target.value);
                            }}
                        />
                    </div>
                    <Select value={status} onChange={(e) => pick(e.target.value)}>
                        <option value="open">Process me (open)</option>
                        <option value="due">Follow-up due</option>
                        <option value="">Sab</option>
                        {Object.entries(STAGES).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v.label}
                            </option>
                        ))}
                    </Select>
                    <Select
                        value={classId}
                        onChange={(e) => {
                            setPage(1);
                            setClassId(e.target.value);
                        }}
                    >
                        <option value="">All classes</option>
                        {classes.map((cl) => (
                            <option key={cl.id} value={cl.id}>
                                {cl.name}
                            </option>
                        ))}
                    </Select>
                    <Select
                        value={source}
                        onChange={(e) => {
                            setPage(1);
                            setSource(e.target.value);
                        }}
                    >
                        <option value="">All sources</option>
                        {Object.entries(SOURCES).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v}
                            </option>
                        ))}
                    </Select>
                </CardContent>
            </Card>

            <TableWrap>
                <Table>
                    <THead>
                        <TR>
                            <TH>Application</TH>
                            <TH>Bachcha</TH>
                            <TH>Class</TH>
                            <TH>Parent</TH>
                            <TH>Source</TH>
                            <TH>Stage</TH>
                            <TH>Next</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <LoadingRow colSpan={7} />
                        ) : items.length === 0 ? (
                            <EmptyRow colSpan={7}>Koi application nahi mili</EmptyRow>
                        ) : (
                            items.map((a) => {
                                const age = ageFrom(a.dob);
                                return (
                                    <TR key={a.id} className="cursor-pointer" onClick={() => setDetailId(a.id)}>
                                        <TD>
                                            <p className="font-mono text-xs text-foreground">{a.applicationNo}</p>
                                            <p className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</p>
                                        </TD>
                                        <TD>
                                            <p className="font-medium text-foreground">{a.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {[a.gender && titleCase(a.gender), age !== null ? age + ' saal' : null].filter(Boolean).join(' - ') || '-'}
                                            </p>
                                        </TD>
                                        <TD className="text-muted-foreground">{a.schoolClass?.name}</TD>
                                        <TD>
                                            <p className="text-sm text-foreground">{a.fatherName || a.motherName || '-'}</p>
                                            <p className="text-xs text-muted-foreground">{a.guardianPhone}</p>
                                        </TD>
                                        <TD className="text-muted-foreground">{SOURCES[a.source]}</TD>
                                        <TD>
                                            <Badge variant={STAGES[a.status].tone}>{STAGES[a.status].label}</Badge>
                                            {a.student ? (
                                                <span className="mt-0.5 block font-mono text-xs text-muted-foreground">{a.student.admissionNo}</span>
                                            ) : null}
                                        </TD>
                                        <TD className="text-sm">
                                            {a.status === 'interview' && a.interviewAt ? (
                                                <span className="text-amber-700 dark:text-amber-300">Interview {formatDateTime(a.interviewAt)}</span>
                                            ) : a.followUpDue ? (
                                                <span className="font-medium text-destructive">Call - {formatDate(a.followUpOn)}</span>
                                            ) : a.open && a.followUpOn ? (
                                                <span className="text-muted-foreground">Follow-up {formatDate(a.followUpOn)}</span>
                                            ) : a.status === 'approved' ? (
                                                <span className="text-primary">Admit karna hai</span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TD>
                                    </TR>
                                );
                            })
                        )}
                    </TBody>
                </Table>
            </TableWrap>

            <Pagination meta={meta} onPage={setPage} />

            <AdmissionModal admission={form} onClose={() => setForm(null)} onSaved={refresh} />
            <AdmissionDetail
                id={detailId}
                canManage={canManage}
                canAdmit={canAdmit}
                onClose={() => setDetailId(null)}
                onChanged={refresh}
                onEdit={(a) => {
                    setDetailId(null);
                    setForm(a);
                }}
                onAdmit={setAdmitting}
                onDelete={setDeleting}
            />
            <AdmitModal
                admission={admitting}
                onClose={() => setAdmitting(null)}
                onDone={() => {
                    const keep = detailId;
                    refresh();
                    // Detail dobara load ho taaki "Admitted" dikhe
                    setDetailId(null);
                    setTimeout(() => setDetailId(keep), 0);
                }}
            />
            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={'Delete ' + (deleting?.applicationNo || '') + '?'}
                message="Enquiry aur uski poori timeline hat jayegi."
                onConfirm={confirmDelete}
            />
        </div>
    );
}
