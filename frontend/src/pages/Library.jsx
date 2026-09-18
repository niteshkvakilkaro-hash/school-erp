import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, BookOpen, BookMarked, AlertTriangle, IndianRupee, Library as LibraryIcon, ArrowLeftRight } from 'lucide-react';
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
import { BookModal } from '@/components/library/BookModal';
import { IssueModal } from '@/components/library/IssueModal';
import { ReturnModal } from '@/components/library/ReturnModal';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

const ISSUE_TONE = { issued: 'default', overdue: 'danger', returned: 'muted' };

export default function Library() {
    const { can } = useAuth();
    const canManage = can('library.manage');
    const canIssue = can('library.issue');

    const [tab, setTab] = useState('books');
    const [summary, setSummary] = useState(null);

    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [filter, setFilter] = useState('');
    const [categories, setCategories] = useState([]);
    const [category, setCategory] = useState('');

    const [bookForm, setBookForm] = useState(null); // null=closed, {}=new, book=edit
    const [issueFor, setIssueFor] = useState(null); // null=closed, {}=pick book, book
    const [returning, setReturning] = useState(null);
    const [deleting, setDeleting] = useState(null);

    const search = useDebounce(searchInput, 400);

    const loadSummary = useCallback(() => {
        api.get('/library/summary').then(({ data }) => setSummary(data.data)).catch(() => {});
        api.get('/library/categories').then(({ data }) => setCategories(data.data)).catch(() => {});
    }, []);

    const load = useCallback(() => {
        setLoading(true);
        const params = { page, limit: 10 };
        if (search) params.search = search;

        let req;
        if (tab === 'books') {
            if (filter) params.availability = filter;
            if (category) params.category = category;
            req = api.get('/library/books', { params });
        } else {
            if (filter) params.status = filter;
            req = api.get('/library/issues', { params });
        }

        req.then(({ data }) => {
            setItems(data.data.items);
            setMeta(data.data.meta);
        })
            .catch((err) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, [tab, page, search, filter, category]);

    useEffect(() => {
        loadSummary();
    }, [loadSummary]);

    useEffect(() => {
        load();
    }, [load]);

    useNewParam(() => {
        if (canManage) setBookForm({});
    });

    const refreshAll = () => {
        loadSummary();
        load();
    };

    const switchTab = (t) => {
        setTab(t);
        setPage(1);
        setFilter('');
        setSearchInput('');
    };

    const confirmDelete = async () => {
        try {
            await api.delete('/library/books/' + deleting.id);
            toast.success('Book delete ho gayi');
            setDeleting(null);
            refreshAll();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const TABS = [
        { key: 'books', label: 'Books', icon: BookOpen },
        { key: 'issues', label: 'Issued books', icon: ArrowLeftRight },
    ];

    return (
        <div>
            <PageHeader
                title="Library"
                subtitle={
                    summary
                        ? 'Loan ' + summary.rules.loanDays + ' din, fine Rs ' + summary.rules.finePerDay +
                          '/din, ek student ko max ' + summary.rules.maxBooksPerStudent + ' books'
                        : 'Loading...'
                }
                actions={
                    <>
                        {canIssue ? (
                            <Button variant="outline" onClick={() => setIssueFor({})}>
                                <ArrowLeftRight /> Issue book
                            </Button>
                        ) : null}
                        {canManage ? (
                            <Button onClick={() => setBookForm({})}>
                                <Plus /> Add book
                            </Button>
                        ) : null}
                    </>
                }
            />

            <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    icon={LibraryIcon}
                    tone="brand"
                    label="Titles"
                    value={summary ? summary.titles : '-'}
                    hint={summary ? summary.copies + ' copies kul' : undefined}
                />
                <StatCard
                    icon={BookMarked}
                    tone="blue"
                    label="Issued"
                    value={summary ? summary.issued : '-'}
                    hint={summary ? summary.available + ' copies available' : undefined}
                />
                <StatCard
                    icon={AlertTriangle}
                    tone="amber"
                    label="Overdue"
                    value={summary ? summary.overdue : '-'}
                    hint={summary ? formatCurrency(summary.finesAccruing) + ' fine chal raha hai' : undefined}
                />
                <StatCard
                    icon={IndianRupee}
                    tone="violet"
                    label="Fines unpaid"
                    value={summary ? formatCurrency(summary.finesUnpaid) : '-'}
                    hint="Wapas aayi books par"
                />
            </div>

            <div className="mb-4 flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => switchTab(key)}
                        className={cn(
                            'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            tab === key ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <Icon className="h-4 w-4" /> {label}
                    </button>
                ))}
            </div>

            <Card className="mb-4">
                <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="relative lg:col-span-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder={tab === 'books' ? 'Title, author, code ya ISBN' : 'Book ya student ka naam'}
                            className="pl-9"
                            value={searchInput}
                            onChange={(e) => {
                                setPage(1);
                                setSearchInput(e.target.value);
                            }}
                        />
                    </div>
                    <Select
                        value={filter}
                        onChange={(e) => {
                            setPage(1);
                            setFilter(e.target.value);
                        }}
                    >
                        {tab === 'books' ? (
                            <>
                                <option value="">All books</option>
                                <option value="available">Available</option>
                                <option value="issued">Kuch copies bahar</option>
                            </>
                        ) : (
                            <>
                                <option value="">All</option>
                                <option value="issued">Issued</option>
                                <option value="overdue">Overdue</option>
                                <option value="returned">Returned</option>
                            </>
                        )}
                    </Select>
                    {tab === 'books' ? (
                        <Select
                            value={category}
                            onChange={(e) => {
                                setPage(1);
                                setCategory(e.target.value);
                            }}
                        >
                            <option value="">All categories</option>
                            {categories.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </Select>
                    ) : null}
                </CardContent>
            </Card>

            {tab === 'books' ? (
                <TableWrap>
                    <Table>
                        <THead>
                            <TR>
                                <TH>Book</TH>
                                <TH>Code</TH>
                                <TH>Category</TH>
                                <TH>Shelf</TH>
                                <TH>Copies</TH>
                                <TH>Status</TH>
                                <TH className="text-right">Actions</TH>
                            </TR>
                        </THead>
                        <TBody>
                            {loading ? (
                                <LoadingRow colSpan={7} />
                            ) : items.length === 0 ? (
                                <EmptyRow colSpan={7}>Koi book nahi mili</EmptyRow>
                            ) : (
                                items.map((b) => (
                                    <TR key={b.id}>
                                        <TD>
                                            <p className="font-medium text-foreground">{b.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {b.author || '-'}
                                                {b.publisher ? ' - ' + b.publisher : ''}
                                            </p>
                                        </TD>
                                        <TD className="font-mono text-xs">{b.code}</TD>
                                        <TD>{b.category ? <Badge variant="secondary">{b.category}</Badge> : '-'}</TD>
                                        <TD className="text-muted-foreground">{b.shelf || '-'}</TD>
                                        <TD>
                                            <span className="font-medium text-foreground">{b.available}</span>
                                            <span className="text-muted-foreground"> / {b.totalCopies}</span>
                                        </TD>
                                        <TD>
                                            {b.status !== 'active' ? (
                                                <Badge variant="muted">Inactive</Badge>
                                            ) : b.available > 0 ? (
                                                <Badge variant="success">Available</Badge>
                                            ) : (
                                                <Badge variant="warning">All issued</Badge>
                                            )}
                                        </TD>
                                        <TD>
                                            <div className="flex items-center justify-end gap-1">
                                                {canIssue ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={b.available <= 0 || b.status !== 'active'}
                                                        onClick={() => setIssueFor(b)}
                                                    >
                                                        Issue
                                                    </Button>
                                                ) : null}
                                                {canManage ? (
                                                    <>
                                                        <Button variant="ghost" size="icon-sm" title="Edit" onClick={() => setBookForm(b)}>
                                                            <Pencil />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            title="Delete"
                                                            className="text-destructive hover:bg-destructive/10"
                                                            onClick={() => setDeleting(b)}
                                                        >
                                                            <Trash2 />
                                                        </Button>
                                                    </>
                                                ) : null}
                                            </div>
                                        </TD>
                                    </TR>
                                ))
                            )}
                        </TBody>
                    </Table>
                </TableWrap>
            ) : (
                <IssuesTable
                    items={items}
                    loading={loading}
                    canIssue={canIssue}
                    onReturn={setReturning}
                />
            )}

            <Pagination meta={meta} onPage={setPage} />

            <BookModal book={bookForm} onClose={() => setBookForm(null)} onSaved={refreshAll} />
            <IssueModal book={issueFor} onClose={() => setIssueFor(null)} onSaved={refreshAll} />
            <ReturnModal issue={returning} onClose={() => setReturning(null)} onSaved={refreshAll} />

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={'Delete "' + (deleting?.title || '') + '"?'}
                message="Jis book ki copies bahar hain wo delete nahi hogi."
                onConfirm={confirmDelete}
            />
        </div>
    );
}

/** Issued books tab - kaun, kab tak, kitna fine. */
function IssuesTable({ items, loading, canIssue, onReturn }) {
    const cols = canIssue ? 7 : 6;
    return (
        <TableWrap>
            <Table>
                <THead>
                    <TR>
                        <TH>Book</TH>
                        <TH>Borrower</TH>
                        <TH>Issued</TH>
                        <TH>Due</TH>
                        <TH>Status</TH>
                        <TH className="text-right">Fine</TH>
                        {canIssue ? <TH className="text-right">Action</TH> : null}
                    </TR>
                </THead>
                <TBody>
                    {loading ? (
                        <LoadingRow colSpan={cols} />
                    ) : items.length === 0 ? (
                        <EmptyRow colSpan={cols}>Koi record nahi mila</EmptyRow>
                    ) : (
                        items.map((i) => (
                            <TR key={i.id}>
                                <TD>
                                    <p className="font-medium text-foreground">{i.book?.title}</p>
                                    <p className="font-mono text-xs text-muted-foreground">{i.book?.code}</p>
                                </TD>
                                <TD>
                                    <p className="text-sm text-foreground">{i.borrower?.name || '-'}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {i.borrower?.ref}
                                        {i.borrower?.className ? ' - ' + i.borrower.className : ''}
                                    </p>
                                </TD>
                                <TD className="text-muted-foreground">{formatDate(i.issuedOn)}</TD>
                                <TD
                                    className={
                                        i.status === 'overdue' ? 'font-medium text-destructive' : 'text-muted-foreground'
                                    }
                                >
                                    {formatDate(i.dueOn)}
                                    {i.status === 'overdue' ? (
                                        <span className="block text-xs">{i.daysLate} din late</span>
                                    ) : null}
                                </TD>
                                <TD>
                                    <Badge variant={ISSUE_TONE[i.status]} className="capitalize">
                                        {i.status}
                                    </Badge>
                                    {i.returnedOn ? (
                                        <span className="mt-0.5 block text-xs text-muted-foreground">
                                            {formatDate(i.returnedOn)}
                                        </span>
                                    ) : null}
                                </TD>
                                <TD className="text-right">
                                    {i.fine > 0 ? (
                                        <>
                                            <span className="font-medium text-foreground">{formatCurrency(i.fine)}</span>
                                            <span className="block text-xs text-muted-foreground">
                                                {i.status !== 'returned' ? 'chal raha' : i.finePaid ? 'paid' : 'unpaid'}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TD>
                                {canIssue ? (
                                    <TD>
                                        <div className="flex justify-end">
                                            {i.status !== 'returned' ? (
                                                <Button size="sm" onClick={() => onReturn(i)}>
                                                    Return
                                                </Button>
                                            ) : i.fine > 0 && !i.finePaid ? (
                                                <Button size="sm" variant="outline" onClick={() => onReturn(i)}>
                                                    Fine paid
                                                </Button>
                                            ) : null}
                                        </div>
                                    </TD>
                                ) : null}
                            </TR>
                        ))
                    )}
                </TBody>
            </Table>
        </TableWrap>
    );
}
