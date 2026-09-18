import { useEffect, useState } from 'react';
import {
    Menu, X, Phone, ArrowRight, Sparkles, GraduationCap, BookOpen, Trophy, Palette, FlaskConical, LogIn, ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HeroSlider, mediaUrl } from './Media';

export const initialsOf = (name = '') =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('');

export function Logo({ school }) {
    return (
        <a href="#top" className="flex items-center gap-3">
            {school.logo ? (
                <img src={mediaUrl(school.logo)} alt={school.name + ' logo'} className="h-10 w-10 rounded-xl bg-white object-contain p-0.5" />
            ) : (
                <span className="s-btn-grad flex h-10 w-10 items-center justify-center rounded-xl text-sm font-extrabold">
                    {initialsOf(school.name)}
                </span>
            )}
            <span className="leading-tight">
                <span className="s-heading block text-[15px] font-bold">{school.name}</span>
                {school.city ? (
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--s-muted)]">{school.city}</span>
                ) : null}
            </span>
        </a>
    );
}

/** Menu me sirf wahi links jinka section page par hai (max 7, warna menu bhar jata hai). */
function linksFor(site, has) {
    return [
        ['#about', 'About', true],
        ['#why', 'Why us', site.highlights?.length > 0],
        ['#gallery', 'Gallery', has.gallery],
        ['#videos', 'Videos', has.videos && !has.gallery],
        ['#news', 'News', has.news],
        ['#admissions', 'Admissions', true],
        ['#faq', 'FAQ', site.faqs?.length > 0 && !has.gallery],
        ['#contact', 'Contact', true],
    ]
        .filter((l) => l[2])
        .slice(0, 7);
}

export function Nav({ school, site, has = {}, onCallback }) {
    const LINKS = linksFor(site, has);
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const on = () => setScrolled(window.scrollY > 12);
        on();
        window.addEventListener('scroll', on, { passive: true });
        return () => window.removeEventListener('scroll', on);
    }, []);

    return (
        <header
            className={cn(
                'sticky top-0 z-40 transition-[background,border-color,box-shadow] duration-300',
                scrolled ? 'border-b border-[var(--s-border)] bg-[var(--s-nav)] backdrop-blur-xl' : 'border-b border-transparent'
            )}
        >
            <nav className="mx-auto flex h-[72px] max-w-7xl items-center gap-6 px-4 sm:px-6">
                <Logo school={school} />
                <div className="ml-6 hidden items-center gap-1 lg:flex">
                    {LINKS.map(([href, label]) => (
                        <a
                            key={href}
                            href={href}
                            className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--s-muted)] transition-colors hover:text-[var(--s-text)]"
                        >
                            {label}
                        </a>
                    ))}
                </div>
                <div className="ml-auto hidden items-center gap-2 md:flex">
                    {school.phone ? (
                        <a
                            href={'tel:' + school.phone}
                            className="flex items-center gap-2 rounded-full border border-[var(--s-border)] px-3.5 py-2 text-sm font-medium transition-colors hover:border-[var(--s-primary)]"
                        >
                            <Phone className="h-4 w-4 text-[var(--s-primary)]" /> {school.phone}
                        </a>
                    ) : null}
                    <a
                        href="/login"
                        className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-[var(--s-muted)] hover:text-[var(--s-text)]"
                    >
                        <LogIn className="h-4 w-4" /> Login
                    </a>
                    {site.admissionOpen ? (
                        <a href="#admissions" className="s-btn-grad flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
                            Apply now <ArrowRight className="h-4 w-4" />
                        </a>
                    ) : null}
                </div>
                <button
                    className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--s-border)] md:ml-2 lg:hidden"
                    onClick={() => setOpen((v) => !v)}
                    aria-label="Menu"
                    aria-expanded={open}
                >
                    {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </nav>
            {open ? (
                <div className="border-t border-[var(--s-border)] bg-[var(--s-bg)] px-4 pb-5 pt-2 lg:hidden">
                    {LINKS.map(([href, label]) => (
                        <a key={href} href={href} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-3 text-[15px] font-medium">
                            {label}
                        </a>
                    ))}
                    <div className="mt-3 grid gap-2">
                        {site.admissionOpen ? (
                            <button onClick={() => { setOpen(false); onCallback(); }} className="s-btn-grad rounded-xl px-4 py-3 text-sm font-semibold">
                                Request a callback
                            </button>
                        ) : null}
                        <a href="/login" className="rounded-xl border border-[var(--s-border)] px-4 py-3 text-center text-sm font-medium">
                            Parent / staff login
                        </a>
                    </div>
                </div>
            ) : null}
        </header>
    );
}

/** Hero ke daayein taraf ka chamakta illustration - sab theme variables se. */
function HeroArt() {
    const tile = 'absolute flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--s-border)] bg-[var(--s-surface-2)] text-[var(--s-primary)] backdrop-blur-md shadow-[0_10px_30px_-10px_var(--s-glow)]';
    const chip = 'absolute flex items-center gap-2 rounded-xl border border-[var(--s-border)] bg-[var(--s-surface)] px-3 py-2 text-xs font-medium backdrop-blur-md shadow-[var(--s-shadow)]';
    return (
        <div className="relative mx-auto aspect-square w-full max-w-[520px]" aria-hidden="true">
            {/* Neeche ka perspective grid */}
            <div
                className="absolute inset-x-0 bottom-0 h-1/2 [transform:perspective(500px)_rotateX(60deg)] opacity-80"
                style={{
                    backgroundImage:
                        'linear-gradient(var(--s-grid) 1px, transparent 1px), linear-gradient(90deg, var(--s-grid) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    maskImage: 'radial-gradient(ellipse at 50% 0%, #000 20%, transparent 70%)',
                }}
            />
            {/* Glow */}
            <div className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--s-glow)] blur-[80px]" />
            {/* Orbit rings */}
            <div className="s-spin-slow absolute left-1/2 top-1/2 h-[82%] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[var(--s-border)]" />
            <div className="absolute left-1/2 top-1/2 h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--s-primary)]/30 shadow-[0_0_40px_-10px_var(--s-glow)_inset]" />
            <div className="absolute left-1/2 top-1/2 h-[18%] w-[96%] -translate-x-1/2 -translate-y-1/2 -rotate-6 rounded-[50%] border border-[var(--s-border)]" />
            {/* Beech ka card */}
            <div className="s-float absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="rotate-45 rounded-[34px] p-[1.5px]" style={{ background: 'var(--s-grad)', boxShadow: '0 30px 80px -20px var(--s-glow)' }}>
                    <div className="flex h-36 w-36 items-center justify-center rounded-[33px] bg-[var(--s-bg-2)] sm:h-44 sm:w-44">
                        <div className="-rotate-45 flex flex-col items-center gap-2">
                            <span className="s-btn-grad flex h-14 w-14 items-center justify-center rounded-2xl">
                                <GraduationCap className="h-7 w-7" />
                            </span>
                            <span className="h-1.5 w-16 rounded-full bg-[var(--s-border)]" />
                        </div>
                    </div>
                </div>
            </div>
            {/* Tairte tiles aur chips */}
            <div className={cn(tile, 's-float-slow left-[8%] top-[30%]')}>
                <BookOpen className="h-5 w-5" />
            </div>
            <div className={cn(tile, 's-float right-[10%] top-[8%] h-10 w-10 rounded-xl')}>
                <FlaskConical className="h-4 w-4" />
            </div>
            <div className={cn(tile, 's-float right-[2%] bottom-[24%]')}>
                <Palette className="h-5 w-5" />
            </div>
            <div className={cn(tile, 's-float-slow left-[22%] bottom-[4%]')}>
                <Trophy className="h-5 w-5" />
            </div>
            <div className={cn(chip, 's-float left-[20%] top-[18%]')}>
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" /> Smart classes
            </div>
            <div className={cn(chip, 's-float-slow right-[4%] top-[32%]')}>
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" /> Sports & arts
            </div>
            <div className={cn(chip, 's-float right-[14%] bottom-[12%]')}>
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" /> Parent app
            </div>
        </div>
    );
}

/** Hero ka text - slider (photo par, safed) aur bina photo wale hero dono me. */
function HeroCopy({ school, site, onCallback, onImage }) {
    const muted = onImage ? 'text-white/80' : 'text-[var(--s-muted)]';
    return (
        <div className="s-reveal max-w-2xl">
            {site.tagline ? (
                <p className={cn('mb-6 inline-flex items-center gap-2 text-sm font-semibold', onImage ? 's-grad-text-bright' : 's-grad-text')}>
                    <Sparkles className={cn('h-4 w-4', onImage ? 'text-white' : 'text-[var(--s-primary)]')} /> {site.tagline}
                </p>
            ) : null}
            <h1 className={cn('text-[2.6rem] font-extrabold leading-[1.05] sm:text-6xl lg:text-[4.2rem]', onImage && 'text-white drop-shadow-sm')}>
                <span className="block">{site.heroTitle || school.name}</span>
                {site.heroHighlight ? (
                    <span className={cn('block pb-2', onImage ? 's-grad-text-bright' : 's-grad-text')}>{site.heroHighlight}</span>
                ) : null}
            </h1>
            {site.heroSubtitle ? <p className={cn('mt-6 max-w-xl text-lg leading-relaxed', muted)}>{site.heroSubtitle}</p> : null}

            <div
                className={cn(
                    'mt-8 flex max-w-xl flex-col gap-3 rounded-2xl border p-2 backdrop-blur sm:flex-row sm:items-center',
                    onImage ? 'border-white/20 bg-white/10' : 'border-[var(--s-border)] bg-[var(--s-surface)] shadow-[var(--s-shadow)]'
                )}
            >
                <p className={cn('flex-1 px-3 py-2 text-sm', muted)}>
                    {site.admissionOpen ? 'Admissions open for ' + (school.session || 'the new session') : 'Visit our campus and meet our teachers'}
                </p>
                <a
                    href={site.admissionOpen ? '#admissions' : '#contact'}
                    className="s-btn-grad flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
                >
                    {site.admissionOpen ? 'Enquire now' : 'Contact us'} <ArrowRight className="h-4 w-4" />
                </a>
            </div>

            {!onImage && site.facilities?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                    {site.facilities.slice(0, 4).map((f) => (
                        <span key={f} className="rounded-full border border-[var(--s-border)] bg-[var(--s-surface)] px-3 py-1.5 text-xs text-[var(--s-muted)]">
                            {f}
                        </span>
                    ))}
                </div>
            ) : null}

            {site.admissionOpen ? (
                <button
                    onClick={onCallback}
                    className={cn(
                        'mt-5 inline-flex items-center gap-1.5 text-sm font-medium',
                        onImage ? 'text-white hover:text-white/80' : 'text-[var(--s-text)] hover:text-[var(--s-primary)]'
                    )}
                >
                    Or ask for a callback <ArrowUpRight className="h-4 w-4" />
                </button>
            ) : null}
        </div>
    );
}

/** School ki photos hon to slider, warna theme wala illustration. */
export function Hero({ school, site, slides, onCallback }) {
    if (slides?.length) {
        return (
            <HeroSlider slides={slides}>
                <HeroCopy school={school} site={site} onCallback={onCallback} onImage />
            </HeroSlider>
        );
    }
    return (
        <section id="top" className="relative">
            {/* Glow neeche fade hota hai taaki agle section par seedhi line na bane */}
            <div
                className="pointer-events-none absolute inset-x-0 top-0 h-[calc(100%+160px)]"
                style={{ background: 'var(--s-hero)', maskImage: 'linear-gradient(to bottom, #000 55%, transparent)' }}
            />
            <div className="s-grid-bg pointer-events-none absolute inset-0" />
            <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-16">
                <HeroCopy school={school} site={site} onCallback={onCallback} />
                <div className="s-reveal hidden sm:block" style={{ animationDelay: '0.15s' }}>
                    <HeroArt />
                </div>
            </div>
        </section>
    );
}
