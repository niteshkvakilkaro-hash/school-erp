import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ImagePlus, Trash2, ArrowUp, ArrowDown, Loader2, ImageOff } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { mediaUrl } from '@/site/Media';

const MAX_MB = 8;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Ek-ek karke upload - har file ka apna error, aur server par bojh kam. */
async function uploadFiles(files, fields, onDone) {
    let ok = 0;
    for (const file of files) {
        if (!TYPES.includes(file.type)) {
            toast.error(file.name + ': sirf JPG, PNG ya WebP');
            continue;
        }
        if (file.size > MAX_MB * 1024 * 1024) {
            toast.error(file.name + ': ' + MAX_MB + ' MB se chhoti photo chahiye');
            continue;
        }
        const fd = new FormData();
        Object.entries(fields).forEach(([k, v]) => v && fd.append(k, v));
        fd.append('file', file);
        try {
            const { data } = await api.post('/website/media', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            onDone(data.data);
            ok++;
        } catch (err) {
            toast.error(file.name + ': ' + err.message);
        }
    }
    if (ok) toast.success(ok + ' photo upload ho gayi');
}

function PickButton({ label, multiple = true, busy, onFiles, disabled, variant = 'default' }) {
    const ref = useRef(null);
    return (
        <>
            <input
                ref={ref}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple={multiple}
                className="hidden"
                onChange={(e) => {
                    const files = [...e.target.files];
                    e.target.value = '';
                    if (files.length) onFiles(files);
                }}
            />
            <Button size="sm" variant={variant} disabled={busy || disabled} onClick={() => ref.current?.click()}>
                {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />} {busy ? 'Uploading...' : label}
            </Button>
        </>
    );
}

async function saveField(item, patch, onChange) {
    try {
        const { data } = await api.put('/website/media/' + item.id, patch);
        onChange(data.data);
    } catch (err) {
        toast.error(err.message);
    }
}

async function removeItem(item, onRemoved) {
    try {
        await api.delete('/website/media/' + item.id);
        onRemoved(item.id);
        toast.success('Photo hata di');
    } catch (err) {
        toast.error(err.message);
    }
}

/** Blur par save hone wala input - har letter par request nahi. */
function InlineInput({ value, onSave, ...props }) {
    const [v, setV] = useState(value || '');
    return (
        <Input
            {...props}
            value={v}
            onChange={(e) => setV(e.target.value)}
            onBlur={() => v !== (value || '') && onSave(v)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
    );
}

/* ---------------- Slider ---------------- */

export function SlideManager({ items, limit, onChange }) {
    const [busy, setBusy] = useState(false);

    const upload = async (files) => {
        setBusy(true);
        await uploadFiles(files.slice(0, limit - items.length), { kind: 'slide' }, (m) => onChange((list) => [...list, m]));
        setBusy(false);
    };

    const move = async (i, d) => {
        const next = [...items];
        [next[i], next[i + d]] = [next[i + d], next[i]];
        onChange(() => next);
        try {
            await api.post('/website/media/reorder', { kind: 'slide', ids: next.map((m) => m.id) });
        } catch (err) {
            toast.error(err.message);
            onChange(() => items);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                    Chaudi (landscape) photos - kam se kam 900px, best 1920×1000. {items.length}/{limit}
                </p>
                <PickButton label="Add slides" busy={busy} disabled={items.length >= limit} onFiles={upload} />
            </div>
            {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    Koi slide nahi - website par theme wala illustration dikhega
                </div>
            ) : null}
            {items.map((m, i) => (
                <div key={m.id} className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center">
                    <img src={mediaUrl(m.thumbUrl || m.url)} alt="" className="aspect-[16/9] w-full rounded-lg object-cover sm:w-40" />
                    <div className="grid min-w-0 flex-1 gap-2">
                        <InlineInput placeholder="Slide ka title (optional)" maxLength={120} value={m.title} onSave={(v) => saveField(m, { title: v }, (u) => onChange((l) => l.map((x) => (x.id === u.id ? u : x))))} aria-label={'Slide ' + (i + 1) + ' title'} />
                        <InlineInput placeholder="Chhoti line (optional)" maxLength={255} value={m.caption} onSave={(v) => saveField(m, { caption: v }, (u) => onChange((l) => l.map((x) => (x.id === u.id ? u : x))))} aria-label={'Slide ' + (i + 1) + ' caption'} />
                    </div>
                    <div className="flex gap-1 sm:flex-col">
                        <Button variant="ghost" size="icon-sm" title="Upar" disabled={i === 0} onClick={() => move(i, -1)}>
                            <ArrowUp />
                        </Button>
                        <Button variant="ghost" size="icon-sm" title="Neeche" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                            <ArrowDown />
                        </Button>
                        <Button variant="ghost" size="icon-sm" title="Delete" className="text-destructive hover:bg-destructive/10" onClick={() => removeItem(m, (id) => onChange((l) => l.filter((x) => x.id !== id)))}>
                            <Trash2 />
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ---------------- Gallery ---------------- */

export function GalleryManager({ items, limit, onChange }) {
    const [busy, setBusy] = useState(false);
    const [album, setAlbum] = useState('Campus');
    const [filter, setFilter] = useState('');
    const albums = [...new Set(['Campus', 'Sports', 'Events', 'Classrooms', ...items.map((g) => g.category).filter(Boolean)])];
    const shown = filter ? items.filter((g) => g.category === filter) : items;

    const upload = async (files) => {
        const cat = album.trim() || 'Campus';
        setBusy(true);
        await uploadFiles(files.slice(0, limit - items.length), { kind: 'gallery', category: cat }, (m) => onChange((list) => [...list, m]));
        setBusy(false);
    };

    const replace = (u) => onChange((l) => l.map((x) => (x.id === u.id ? u : x)));

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-2 rounded-xl bg-muted/50 p-3">
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                    Album (naya bhi likh sakte hain)
                    <Input list="albums" className="w-52" value={album} maxLength={40} onChange={(e) => setAlbum(e.target.value)} />
                    <datalist id="albums">
                        {albums.map((a) => (
                            <option key={a} value={a} />
                        ))}
                    </datalist>
                </label>
                <PickButton label="Photos upload" busy={busy} disabled={items.length >= limit} onFiles={upload} />
                <span className="ml-auto text-xs text-muted-foreground">
                    {items.length}/{limit} photos - ek saath kai chun sakte hain
                </span>
            </div>

            {items.length ? (
                <div className="flex flex-wrap gap-2">
                    {['', ...albums.filter((a) => items.some((g) => g.category === a))].map((a) => (
                        <button
                            key={a || 'all'}
                            onClick={() => setFilter(a)}
                            className={cn('rounded-full border px-3 py-1 text-xs font-medium', filter === a ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground')}
                        >
                            {a || 'All'} ({a ? items.filter((g) => g.category === a).length : items.length})
                        </button>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    Gallery khaali hai - website par ye section nahi dikhega
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {shown.map((g) => (
                    <div key={g.id} className="overflow-hidden rounded-xl border border-border bg-card">
                        <div className="relative">
                            <img src={mediaUrl(g.thumbUrl || g.url)} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Delete"
                                className="absolute right-1.5 top-1.5 bg-black/50 text-white hover:bg-destructive hover:text-white"
                                onClick={() => removeItem(g, (id) => onChange((l) => l.filter((x) => x.id !== id)))}
                            >
                                <Trash2 />
                            </Button>
                        </div>
                        <div className="grid gap-1.5 p-2">
                            <InlineInput className="h-8 text-xs" placeholder="Caption" maxLength={255} value={g.caption} onSave={(v) => saveField(g, { caption: v }, replace)} aria-label="Caption" />
                            <Select className="h-8 text-xs" value={g.category || ''} onChange={(e) => saveField(g, { category: e.target.value }, replace)} aria-label="Album">
                                {albums.map((a) => (
                                    <option key={a} value={a}>
                                        {a}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ---------------- Logo / principal ---------------- */

export function SinglePhoto({ kind, label, hint, item, onChange, round }) {
    const [busy, setBusy] = useState(false);
    const upload = async (files) => {
        setBusy(true);
        await uploadFiles(files.slice(0, 1), { kind }, (m) => onChange(m));
        setBusy(false);
    };
    return (
        <div className="flex items-center gap-4 rounded-xl border border-border p-4">
            <div className={cn('flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border border-border bg-muted', round ? 'rounded-full' : 'rounded-xl')}>
                {item ? (
                    <img src={mediaUrl(item.url)} alt="" className={cn('h-full w-full', round ? 'object-cover' : 'object-contain p-1')} />
                ) : (
                    <ImageOff className="h-6 w-6 text-muted-foreground" />
                )}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
                <div className="mt-2 flex gap-2">
                    <PickButton label={item ? 'Badliye' : 'Upload'} multiple={false} busy={busy} onFiles={upload} variant="outline" />
                    {item ? (
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => removeItem(item, () => onChange(null))}>
                            <Trash2 /> Hataiye
                        </Button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

