import { Plus, Trash2, PlayCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { parseVideo } from '@/site/Media';

function Row({ children, onRemove, label }) {
    return (
        <div className="flex gap-2 rounded-xl border border-border p-3">
            <div className="grid min-w-0 flex-1 gap-2">{children}</div>
            <Button variant="ghost" size="icon-sm" title={'Remove ' + label} className="text-destructive hover:bg-destructive/10" onClick={onRemove}>
                <Trash2 />
            </Button>
        </div>
    );
}

function AddButton({ onClick, disabled, children }) {
    return (
        <Button size="sm" variant="outline" onClick={onClick} disabled={disabled}>
            <Plus /> {children}
        </Button>
    );
}

const update = (list, i, patch) => list.map((x, j) => (j === i ? { ...x, ...patch } : x));

export function VideosEditor({ value, onChange }) {
    return (
        <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
                YouTube ya Vimeo par video daaliye aur uska link yahan paste kijiye (campus tour, annual day...).
            </p>
            {value.map((v, i) => {
                const parsed = v.url ? parseVideo(v.url) : null;
                return (
                    <Row key={i} label="video" onRemove={() => onChange(value.filter((_, j) => j !== i))}>
                        <div className="flex gap-3">
                            <div className="hidden h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted sm:flex">
                                {parsed?.thumb ? (
                                    <img src={parsed.thumb} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <PlayCircle className="h-6 w-6 text-muted-foreground" />
                                )}
                            </div>
                            <div className="grid min-w-0 flex-1 gap-2">
                                <Input placeholder="Title - e.g. Campus tour" maxLength={100} value={v.title} onChange={(e) => onChange(update(value, i, { title: e.target.value }))} aria-label={'Video ' + (i + 1) + ' title'} />
                                <Input placeholder="https://www.youtube.com/watch?v=..." value={v.url} onChange={(e) => onChange(update(value, i, { url: e.target.value.trim() }))} aria-label={'Video ' + (i + 1) + ' link'} />
                                {v.url && !parsed ? (
                                    <p className="flex items-center gap-1 text-xs text-destructive">
                                        <AlertCircle className="h-3.5 w-3.5" /> Ye YouTube / Vimeo link nahi lagta
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    </Row>
                );
            })}
            <AddButton disabled={value.length >= 12} onClick={() => onChange([...value, { title: '', url: '' }])}>
                Add video
            </AddButton>
        </div>
    );
}

export function TestimonialsEditor({ value, onChange }) {
    return (
        <div className="space-y-3">
            {value.map((t, i) => (
                <Row key={i} label="review" onRemove={() => onChange(value.filter((_, j) => j !== i))}>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <Input placeholder="Naam" maxLength={80} value={t.name} onChange={(e) => onChange(update(value, i, { name: e.target.value }))} aria-label={'Review ' + (i + 1) + ' name'} />
                        <Input placeholder="Parent, Class 4 / Alumni 2022" maxLength={80} value={t.role} onChange={(e) => onChange(update(value, i, { role: e.target.value }))} aria-label={'Review ' + (i + 1) + ' role'} />
                    </div>
                    <Textarea rows={2} placeholder="Unhone kya kaha" maxLength={500} value={t.text} onChange={(e) => onChange(update(value, i, { text: e.target.value }))} aria-label={'Review ' + (i + 1) + ' text'} />
                </Row>
            ))}
            <AddButton disabled={value.length >= 12} onClick={() => onChange([...value, { name: '', role: '', text: '' }])}>
                Add review
            </AddButton>
        </div>
    );
}

export function FaqEditor({ value, onChange }) {
    return (
        <div className="space-y-3">
            {value.map((f, i) => (
                <Row key={i} label="question" onRemove={() => onChange(value.filter((_, j) => j !== i))}>
                    <Input placeholder="Sawal" maxLength={200} value={f.q} onChange={(e) => onChange(update(value, i, { q: e.target.value }))} aria-label={'FAQ ' + (i + 1) + ' question'} />
                    <Textarea rows={2} placeholder="Jawab" maxLength={1000} value={f.a} onChange={(e) => onChange(update(value, i, { a: e.target.value }))} aria-label={'FAQ ' + (i + 1) + ' answer'} />
                </Row>
            ))}
            <AddButton disabled={value.length >= 15} onClick={() => onChange([...value, { q: '', a: '' }])}>
                Add question
            </AddButton>
        </div>
    );
}
