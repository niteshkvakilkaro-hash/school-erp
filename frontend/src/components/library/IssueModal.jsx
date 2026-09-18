import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { Picker } from '@/components/ui/picker';
import { fullName, toDateInput } from '@/lib/utils';

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
