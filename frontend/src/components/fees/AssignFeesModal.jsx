import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Field, SelectField, TextField } from '@/components/ui/field';
import { formatCurrency, toDateInput } from '@/lib/utils';

/**
 * Fee heads ko ek poori class/section par ek saath lagata hai.
 * Pehle se lage hue heads skip ho jaate hain - backend duplicate nahi banata.
 */
export function AssignFeesModal({ open, onOpenChange, classes, onChanged }) {
    const [heads, setHeads] = useState([]);
    const [selected, setSelected] = useState([]);
    const [classId, setClassId] = useState('');
    const [sectionId, setSectionId] = useState('');
    const [dueDate, setDueDate] = useState(toDateInput(new Date()));
    const [overwriteAmount, setOverwriteAmount] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!open) {
            setSelected([]);
            setClassId('');
            setSectionId('');
            setErrors({});
            return;
        }
        api.get('/fees/heads', { params: { status: 'active' } })
            .then(({ data }) => setHeads(data.data))
            .catch((err) => toast.error(err.message));
    }, [open]);

    const sections = useMemo(
        () => classes.find((c) => String(c.id) === String(classId))?.sections || [],
        [classes, classId]
    );

    // Class chuni ho to us class ke + "all classes" wale heads hi relevant hain
    const visibleHeads = useMemo(() => {
        if (!classId) return heads;
        return heads.filter((h) => !h.classId || String(h.classId) === String(classId));
    }, [heads, classId]);

    const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

    const total = visibleHeads
        .filter((h) => selected.includes(h.id))
        .reduce((sum, h) => sum + Number(h.amount), 0);

    const submit = async (e) => {
        e.preventDefault();
        if (selected.length === 0) {
            toast.error('Kam se kam ek fee head chuniye');
            return;
        }
        if (!classId) {
            toast.error('Class chuniye');
            return;
        }

        setSaving(true);
        setErrors({});
        try {
            const { data } = await api.post('/fees/assign', {
                feeHeadIds: selected,
                classId,
                sectionId: sectionId || undefined,
                dueDate,
                overwriteAmount,
            });
            toast.success(data.message);
            onOpenChange(false);
            onChanged?.();
        } catch (err) {
            setErrors(err.fieldErrors || {});
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            title="Assign fees"
            description="Chuni hui class ke saare active students par ye fees lag jayengi"
            size="md"
            footer={
                <>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={saving}>
                        {saving ? 'Assigning...' : 'Assign fees'}
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                        label="Class"
                        name="classId"
                        required
                        value={classId}
                        onChange={(e) => {
                            setClassId(e.target.value);
                            setSectionId('');
                        }}
                        error={errors.classId}
                    >
                        <option value="">Select class</option>
                        {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </SelectField>
                    <SelectField
                        label="Section"
                        name="sectionId"
                        value={sectionId}
                        onChange={(e) => setSectionId(e.target.value)}
                        disabled={!classId}
                        hint="Khaali = poori class"
                    >
                        <option value="">Poori class</option>
                        {sections.map((s) => (
                            <option key={s.id} value={s.id}>
                                Section {s.name}
                            </option>
                        ))}
                    </SelectField>
                </div>

                <TextField
                    label="Due date"
                    name="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    error={errors.dueDate}
                />

                <Field label="Fee heads" hint={selected.length + ' selected'}>
                    <div className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-border p-3">
                        {visibleHeads.length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                                Koi active fee head nahi
                            </p>
                        ) : (
                            visibleHeads.map((h) => (
                                <label
                                    key={h.id}
                                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-accent"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(h.id)}
                                        onChange={() => toggle(h.id)}
                                        className="h-4 w-4 rounded border-input accent-[var(--primary)]"
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-foreground">{h.name}</span>
                                        <span className="block text-xs text-muted-foreground">
                                            {h.code}
                                            {h.isOptional ? ' - optional' : ''}
                                        </span>
                                    </span>
                                    <span className="shrink-0 font-medium text-foreground">
                                        {formatCurrency(h.amount)}
                                    </span>
                                </label>
                            ))
                        )}
                    </div>
                </Field>

                {selected.length > 0 ? (
                    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
                        <span className="text-sm text-muted-foreground">Per student total</span>
                        <span className="text-lg font-semibold text-foreground">{formatCurrency(total)}</span>
                    </div>
                ) : null}

                <label className="flex items-start gap-2.5 text-sm text-foreground">
                    <input
                        type="checkbox"
                        checked={overwriteAmount}
                        onChange={(e) => setOverwriteAmount(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-input accent-[var(--primary)]"
                    />
                    <span>
                        Pehle se lagi hui fees ka amount bhi update kijiye
                        <span className="block text-xs text-muted-foreground">
                            Warna sirf nayi fees lagti hain, purani jaisi ki taisi rehti hain
                        </span>
                    </span>
                </label>

                <button type="submit" className="hidden" />
            </form>
        </Modal>
    );
}
