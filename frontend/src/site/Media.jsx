import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Play, Images, Clapperboard, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Upload ki photo ka poora URL - API alag domain par ho to bhi chale. */
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
export const mediaUrl = (u) => (!u ? '' : /^https?:\/\//.test(u) ? u : API_BASE + u);

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Left/right swipe - touch aur mouse dono. */
function useSwipe(onPrev, onNext) {
    const start = useRef(null);
    return {
        onPointerDown: (e) => (start.current = e.clientX),
        onPointerUp: (e) => {
            if (start.current === null) return;
            const dx = e.clientX - start.current;
            start.current = null;
            if (Math.abs(dx) > 50) (dx > 0 ? onPrev : onNext)();
        },
    };
}

function Eyebrow({ icon: Icon = Sparkles, children }) {
    return (
        <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--s-primary)]">
            <Icon className="h-3.5 w-3.5" /> {children}
        </p>
    );
}

/* ---------------- Hero slider ---------------- */

export function HeroSlider({ slides, children }) {
    const [i, setI] = useState(0);
    const [paused, setPaused] = useState(false);
    const n = slides.length;
    const go = useCallback((k) => setI((c) => (c + k + n) % n), [n]);
    const swipe = useSwipe(() => go(-1), () => go(1));

    useEffect(() => {
        if (n < 2 || paused || reducedMotion()) return undefined;
        const t = setTimeout(() => go(1), 6500);
        return () => clearTimeout(t);
    }, [i, paused, n, go]);

    const cur = slides[i];
    return (
        <section id="top" className="px-2 pt-2 sm:px-4 sm:pt-3">
            <div
                className="relative isolate overflow-hidden rounded-[28px] border border-[var(--s-border)] bg-black sm:rounded-[36px]"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                onFocusCapture={() => setPaused(true)}
                onBlurCapture={() => setPaused(false)}
                {...swipe}
                aria-roledescription="carousel"
                aria-label="School photos"
            >
                {slides.map((s, k) => (
                    <img
                        key={s.id}
                        src={mediaUrl(s.url)}
                        alt={s.title || ''}
                        draggable="false"
                        loading={k === 0 ? 'eager' : 'lazy'}
                        className={cn(
                            'absolute inset-0 h-full w-full select-none object-cover transition-[opacity,transform] duration-[1200ms] ease-out',
                            k === i ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
                        )}
                        aria-hidden={k !== i}
                    />
                ))}
                {/* Text padhne layak rahe - baayein se andhera */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/5" />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />

                <div className="relative mx-auto flex min-h-[600px] max-w-7xl flex-col justify-center px-5 py-16 text-white sm:min-h-[680px] sm:px-10 lg:min-h-[min(86vh,760px)]">
                    {children}
                </div>

                {/* Slide ka naam + controls */}
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-5 pb-5 sm:px-10 sm:pb-8">
                    <div className="hidden min-w-0 max-w-sm rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white backdrop-blur-md sm:block">
                        <p className="font-mono text-[11px] text-white/70">
                            {String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
                        </p>
                        {cur.title ? <p className="truncate text-sm font-semibold">{cur.title}</p> : null}
                        {cur.caption ? <p className="truncate text-xs text-white/75">{cur.caption}</p> : null}
                    </div>
                    {n > 1 ? (
                        <div className="ml-auto flex items-center gap-3">
                            <div className="flex gap-1.5">
                                {slides.map((s, k) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setI(k)}
                                        aria-label={'Slide ' + (k + 1)}
                                        aria-current={k === i}
                                        className={cn('h-1.5 rounded-full transition-all', k === i ? 'w-8 bg-white' : 'w-3 bg-white/40 hover:bg-white/70')}
                                    />
                                ))}
                            </div>
                            <button onClick={() => go(-1)} aria-label="Previous" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-md hover:bg-white/20">
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button onClick={() => go(1)} aria-label="Next" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-md hover:bg-white/20">
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </section>
    );
}

/* ---------------- Gallery + lightbox ---------------- */

function Lightbox({ items, index, onClose, onIndex }) {
    const n = items.length;
    const go = useCallback((k) => onIndex((index + k + n) % n), [index, n, onIndex]);
    const swipe = useSwipe(() => go(-1), () => go(1));

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') go(-1);
            if (e.key === 'ArrowRight') go(1);
        };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [go, onClose]);

    const it = items[index];
    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/92 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Photo viewer">
            <div className="flex items-center justify-between px-4 py-3 text-white sm:px-6">
                <p className="text-sm">
                    <span className="font-mono text-white/60">
                        {index + 1} / {n}
                    </span>
                    {it.category ? <span className="ml-3 rounded-full bg-white/10 px-2.5 py-1 text-xs">{it.category}</span> : null}
                </p>
                <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                    <X className="h-5 w-5" />
                </button>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16" {...swipe}>
                <img key={it.id} src={mediaUrl(it.url)} alt={it.caption || ''} draggable="false" className="s-reveal max-h-full max-w-full select-none rounded-lg object-contain" />
                {n > 1 ? (
                    <>
                        <button onClick={() => go(-1)} aria-label="Previous" className="absolute left-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex">
                            <ChevronLeft className="h-6 w-6" />
                        </button>
                        <button onClick={() => go(1)} aria-label="Next" className="absolute right-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex">
                            <ChevronRight className="h-6 w-6" />
                        </button>
                    </>
                ) : null}
            </div>
            <p className="min-h-12 px-4 py-4 text-center text-sm text-white/85">{it.caption || it.title || ''}</p>
        </div>
    );
}

export function Gallery({ items }) {
    const [album, setAlbum] = useState('All');
    const [open, setOpen] = useState(null);
    if (!items?.length) return null;

    const albums = ['All', ...new Set(items.map((g) => g.category).filter(Boolean))];
    const shown = album === 'All' ? items : items.filter((g) => g.category === album);

    return (
        <section id="gallery">
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
                <div className="flex flex-wrap items-end justify-between gap-6">
                    <div>
                        <Eyebrow icon={Images}>Photo gallery</Eyebrow>
                        <h2 className="text-3xl font-extrabold sm:text-4xl">Life at our school</h2>
                    </div>
                    {albums.length > 2 ? (
                        <div className="flex flex-wrap gap-2" role="tablist">
                            {albums.map((a) => (
                                <button
                                    key={a}
                                    role="tab"
                                    aria-selected={album === a}
                                    onClick={() => setAlbum(a)}
                                    className={cn(
                                        'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                                        album === a
                                            ? 'border-transparent s-btn-grad'
                                            : 'border-[var(--s-border)] bg-[var(--s-surface)] text-[var(--s-muted)] hover:text-[var(--s-text)]'
                                    )}
                                >
                                    {a}
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>

                <div className="mt-10 columns-2 gap-4 md:columns-3 [&>*]:mb-4">
                    {shown.map((g) => (
                        <button
                            key={g.id}
                            onClick={() => setOpen(shown.indexOf(g))}
                            className="group relative block w-full break-inside-avoid overflow-hidden rounded-2xl border border-[var(--s-border)] bg-[var(--s-surface)]"
                            aria-label={'Open photo: ' + (g.caption || g.category || 'photo')}
                        >
                            <img
                                src={mediaUrl(g.thumbUrl || g.url)}
                                alt={g.caption || ''}
                                loading="lazy"
                                width={g.width || undefined}
                                height={g.height || undefined}
                                className="h-auto w-full transition-transform duration-500 group-hover:scale-105"
                            />
                            {g.caption ? (
                                <span className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/75 to-transparent p-3 pt-10 text-left text-sm font-medium text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                                    {g.caption}
                                </span>
                            ) : null}
                        </button>
                    ))}
                </div>
            </div>
            {open !== null ? <Lightbox items={shown} index={open} onIndex={setOpen} onClose={() => setOpen(null)} /> : null}
        </section>
    );
}

/* ---------------- Videos ---------------- */

/** YouTube / Vimeo link se embed id. */
export function parseVideo(url = '') {
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
    if (yt) return { provider: 'youtube', id: yt[1], thumb: 'https://i.ytimg.com/vi/' + yt[1] + '/hqdefault.jpg' };
    const vm = url.match(/vimeo\.com\/(\d+)/);
    if (vm) return { provider: 'vimeo', id: vm[1], thumb: null };
    return null;
}

function VideoCard({ video }) {
    const [playing, setPlaying] = useState(false);
    const v = parseVideo(video.url);
    if (!v) return null;
    const src =
        v.provider === 'youtube'
            ? 'https://www.youtube-nocookie.com/embed/' + v.id + '?autoplay=1&rel=0'
            : 'https://player.vimeo.com/video/' + v.id + '?autoplay=1';
    return (
        <figure className="s-card overflow-hidden rounded-3xl">
            <div className="relative aspect-video bg-[var(--s-bg-2)]">
                {playing ? (
                    <iframe
                        src={src}
                        title={video.title || 'School video'}
                        className="absolute inset-0 h-full w-full"
                        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                        allowFullScreen
                    />
                ) : (
                    <button onClick={() => setPlaying(true)} className="group absolute inset-0" aria-label={'Play video: ' + (video.title || 'School video')}>
                        {v.thumb ? (
                            <img src={v.thumb} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                            <span className="block h-full w-full" style={{ background: 'var(--s-hero), var(--s-bg-2)' }} />
                        )}
                        <span className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/15" />
                        <span className="s-btn-grad absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full">
                            <Play className="ml-1 h-7 w-7 fill-current" />
                        </span>
                    </button>
                )}
            </div>
            {video.title ? <figcaption className="px-5 py-4 font-semibold">{video.title}</figcaption> : null}
        </figure>
    );
}

export function Videos({ videos }) {
    const list = (videos || []).filter((v) => parseVideo(v.url));
    if (!list.length) return null;
    return (
        <section id="videos" className="bg-[var(--s-bg-2)]">
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
                <Eyebrow icon={Clapperboard}>Videos</Eyebrow>
                <h2 className="text-3xl font-extrabold sm:text-4xl">See us in action</h2>
                <div className={cn('mt-10 grid gap-6', list.length === 1 ? 'mx-auto max-w-4xl' : 'md:grid-cols-2')}>
                    {list.map((v, i) => (
                        <VideoCard key={v.url + i} video={v} />
                    ))}
                </div>
            </div>
        </section>
    );
}
