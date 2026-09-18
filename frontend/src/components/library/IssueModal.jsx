import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search, Check } from 'lucide-react';
import api from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, TextField } from '@/components/ui/field';
import { cn, fullName, toDateInput } from '@/lib/utils';

/** Search-box jo list dikhata hai aur ek item chunne deta hai. */
function Picker({ label, placeholder, fetcher, render, value, onPick }) {
    const [q, setQ] = useState('');
    const [items, setItems] = useState([]);
    const query = useDebounce(q, 300);

    useEffect(() => {
        fetcher(query).then(setItems).catch(() => setItems([]));
        // fetcher har render par naya hota hai - sirf query par chalna chahiye
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    return (
        <Field label={label}>
            <div className="space-y-2 rounded-xl border border-border p-3">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
                <div className="max-h-44 space-y-1 overflow-y-auto">
                    {items.length === 0 ? (
                        <p className="py-3 text-center text-sm text-muted-foreground">Kuch nahi mila</p>
                    ) : (
                        items.map((it) => {
                            const on = value?.id === it.id;
                            const { title, sub, disabled } = render(it);
                            return (
                                <button
                                    type="button"
                                    key={it.id}
                                    disabled={disabled}
                                    onClick={() => onPick(it)}
                                    className={cn(
                                        'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors',
                                        on ? 'bg-accent' : 'hover:bg-muted',
                                        disabled && 'cursor-not-allowed opacity-50'
                                    )}
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-foreground">{title}</span>
                                        <span className="block truncate text-xs text-muted-foreground">{sub}</span>
                                    </span>
                                    {on ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </Field>
    );
}

/** book: null = band, {} = book bhi chunni hai, book object = seedha student chuniye */
export function IssueModal({ book, onClose, onSaved }) {
    const [pickedBook, setPickedBook] = useState(null);
    const [student, setStudent] = useState(null);
    const [dueOn, setDueOn] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!book) return;
        setPickedBook(book.id ? book : null);
        setStudent(null);
        const d = new Date();
        d.setDate(d.getDate() + 14);
        setDueOn(toDateInput(d));
    }, [book]);

    const submit = async (e) => {
        e?.preventDefault();
        if (!pickedBook) return toast.error('Book chuniye');
        if (!student) return toast.error('Student chuniye');

        setSaving(true);
        try {
            const { data } = await api.post('/library/issues', {
                bookId: pickedBook.id,
                studentId: student.id,
                dueOn,
            });
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
            open={Boolean(book)}
            onOpenChange={(v) => !v && onClose()}
            title="Issue book"
            description={
                pickedBook ? pickedBook.title + ' (' + pickedBook.available + ' available)' : 'Book aur student chuniye'
            }
            size="md"
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={saving || !pickedBook || !student}>
                        {saving ? 'Issuing...' : 'Issue book'}
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} className="space-y-4">
                {!book?.id ? (
                    <Picker
                        label="Book"
                        placeholder="Title ya code"
                        value={pickedBook}
                        onPick={setPickedBook}
                        fetcher={(q) =>
                            api
                                .get('/library/books', { params: { limit: 20, search: q || undefined } })
                                .then(({ data }) => data.data.items)
                        }
                        render={(b) => ({
                            title: b.title,
                            sub: b.code + ' - ' + b.available + '/' + b.totalCopies + ' available',
                            disabled: b.available <= 0,
                        })}
                    />
                ) : null}

                <Picker
                    label="Student"
                    placeholder="Naam ya admission no"
                    value={student}
                    onPick={setStudent}
                    fetcher={(q) =>
                        api
                            .get('/students', { params: { limit: 20, search: q || undefined, status: 'active' } })
                            .then(({ data }) => data.data.items)
                    }
                    render={(s) => ({
                        title: fullName(s),
                        sub:
                            s.admissionNo +
                            (s.schoolClass ? ' - ' + s.schoolClass.name : '') +
                            (s.section ? ' ' + s.section.name : ''),
                        disabled: false,
                    })}
                />

                <TextField
                    label="Due date"
                    name="dueOn"
                    type="date"
                    value={dueOn}
                    onChange={(e) => setDueOn(e.target.value)}
                    hint="Default 14 din"
                />
                <button type="submit" className="hidden" />
            </form>
        </Modal>
    );
}
