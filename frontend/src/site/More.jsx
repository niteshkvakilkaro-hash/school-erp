import { useState } from 'react';
import { Quote, Plus, Minus, MessageCircleQuestion, HeartHandshake, PhoneCall } from 'lucide-react';
import { cn } from '@/lib/utils';
import { initialsOf } from './Hero';

function Eyebrow({ icon: Icon, children }) {
    return (
        <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--s-primary)]">
            <Icon className="h-3.5 w-3.5" /> {children}
        </p>
    );
}

export function Testimonials({ items }) {
    if (!items?.length) return null;
    return (
        <section id="reviews">
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
                <div className="mx-auto max-w-2xl text-center">
                    <Eyebrow icon={HeartHandshake}>Parents & alumni</Eyebrow>
                    <h2 className="text-3xl font-extrabold sm:text-4xl">Families who trust us</h2>
                </div>
                <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {items.map((t, i) => (
                        <figure key={t.name + i} className="s-card flex flex-col rounded-3xl p-7">
                            <Quote className="h-8 w-8 text-[var(--s-primary)] opacity-80" />
                            <blockquote className="mt-4 flex-1 leading-relaxed">{t.text}</blockquote>
                            <figcaption className="mt-6 flex items-center gap-3 border-t border-[var(--s-border)] pt-5">
                                <span className="s-btn-grad flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                                    {initialsOf(t.name)}
                                </span>
                                <span className="min-w-0">
                                    <span className="block font-semibold">{t.name}</span>
                                    {t.role ? <span className="block text-sm text-[var(--s-muted)]">{t.role}</span> : null}
                                </span>
                            </figcaption>
                        </figure>
                    ))}
                </div>
            </div>
        </section>
    );
}

export function Faq({ items, school }) {
    const [open, setOpen] = useState(0);
    if (!items?.length) return null;
    return (
        <section id="faq" className="bg-[var(--s-bg-2)]">
            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.6fr] lg:py-24">
                <div>
                    <Eyebrow icon={MessageCircleQuestion}>FAQ</Eyebrow>
                    <h2 className="text-3xl font-extrabold sm:text-4xl">Questions parents often ask</h2>
                    <p className="mt-4 text-[var(--s-muted)]">Didn&apos;t find your answer? Our office is happy to help.</p>
                    {school.phone ? (
                        <a href={'tel:' + school.phone} className="mt-6 inline-flex items-center gap-2 font-semibold text-[var(--s-primary)]">
                            <PhoneCall className="h-4 w-4" /> {school.phone}
                        </a>
                    ) : null}
                </div>
                <div className="space-y-3">
                    {items.map((f, i) => {
                        const on = open === i;
                        return (
                            <div key={f.q + i} className={cn('s-card overflow-hidden rounded-2xl transition-colors', on && 'border-[var(--s-primary)]')}>
                                <h3>
                                    <button
                                        onClick={() => setOpen(on ? -1 : i)}
                                        aria-expanded={on}
                                        aria-controls={'faq-' + i}
                                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold"
                                    >
                                        {f.q}
                                        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', on ? 's-btn-grad' : 'bg-[var(--s-primary-soft)] text-[var(--s-primary)]')}>
                                            {on ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                        </span>
                                    </button>
                                </h3>
                                <div id={'faq-' + i} hidden={!on} className="px-5 pb-5 leading-relaxed text-[var(--s-muted)]">
                                    {f.a}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
