import { useEffect, useState } from 'react';
import { Search, Check } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { cn } from '@/lib/utils';

/** Search-box jo list dikhata hai aur ek item chunne deta hai. */
export function Picker({ label, placeholder, fetcher, render, value, onPick }) {
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
