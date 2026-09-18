import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { TextField, SelectField } from '@/components/ui/field';

const BLANK = {
    title: '',
    author: '',
    publisher: '',
    isbn: '',
    code: '',
    category: '',
    classId: '',
    totalCopies: 1,
    shelf: '',
    price: '',
    status: 'active',
};

/** book: null = band, {} = nayi book, book object = edit */
export function BookModal({ book, onClose, onSaved }) {
    const isEdit = Boolean(book?.id);
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [classes, setClasses] = useState([]);

    useEffect(() => {
        if (!book) return;
        setErrors({});
        setForm(
            isEdit
                ? {
                      ...BLANK,
                      ...Object.fromEntries(Object.entries(book).map(([k, v]) => [k, v ?? ''])),
                      classId: book.classId || '',
                  }
                : BLANK
        );
        api.get('/classes/options').then(({ data }) => setClasses(data.data)).catch(() => {});
    }, [book, isEdit]);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            const payload = {
                title: form.title,
                author: form.author || undefined,
                publisher: form.publisher || undefined,
                isbn: form.isbn || undefined,
                code: form.code,
                category: form.category || undefined,
                classId: form.classId || null,
                totalCopies: form.totalCopies,
                shelf: form.shelf || undefined,
                price: form.price === '' ? undefined : form.price,
                status: form.status,
            };
            if (isEdit) {
                await api.put('/library/books/' + book.id, payload);
                toast.success('Book update ho gayi');
            } else {
                await api.post('/library/books', payload);
                toast.success('Book add ho gayi');
            }
            onClose();
            onSaved?.();
        } catch (err) {
            setErrors(err.fieldErrors || {});
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={Boolean(book)}
            onOpenChange={(v) => !v && onClose()}
            title={isEdit ? 'Edit book' : 'Add book'}
            size="md"
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={saving}>
                        {saving ? 'Saving...' : 'Save'}
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                <TextField label="Title" name="title" required className="sm:col-span-2" value={form.title} onChange={set('title')} error={errors.title} />
                <TextField label="Author" name="author" value={form.author} onChange={set('author')} error={errors.author} />
                <TextField label="Publisher" name="publisher" value={form.publisher} onChange={set('publisher')} error={errors.publisher} />
                <TextField label="Book code" name="code" required placeholder="LIB-0013" value={form.code} onChange={set('code')} error={errors.code} hint="School ka accession number" />
                <TextField label="ISBN" name="isbn" value={form.isbn} onChange={set('isbn')} error={errors.isbn} />
                <TextField label="Category" name="category" placeholder="Fiction, Textbook..." value={form.category} onChange={set('category')} error={errors.category} />
                <SelectField label="Class" name="classId" value={form.classId} onChange={set('classId')} hint="Khaali = general">
                    <option value="">General</option>
                    {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </SelectField>
                <TextField label="Copies" name="totalCopies" type="number" min="1" required value={form.totalCopies} onChange={set('totalCopies')} error={errors.totalCopies} />
                <TextField label="Shelf" name="shelf" value={form.shelf} onChange={set('shelf')} error={errors.shelf} />
                <TextField label="Price" name="price" type="number" min="0" value={form.price} onChange={set('price')} error={errors.price} />
                <SelectField label="Status" name="status" value={form.status} onChange={set('status')}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </SelectField>
                <button type="submit" className="hidden" />
            </form>
        </Modal>
    );
}
