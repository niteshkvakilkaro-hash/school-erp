import { useEffect, useState } from 'react';
import {
    GraduationCap, MonitorSmartphone, Bus, Smartphone, Trophy, HeartHandshake, FlaskConical, Palette, Quote, Users,
    School, CalendarDays, Megaphone, MapPin, Phone, Mail, Instagram, Facebook, Youtube, MessageCircle, X, Sparkles,
    PhoneCall, BookOpen, Music, Dumbbell, Computer, Library as LibraryIcon, Leaf,
} from 'lucide-react';
import { EnquiryForm } from './EnquiryForm';
import { Logo } from './Hero';
import { mediaUrl } from './Media';

const HIGHLIGHT_ICONS = [GraduationCap, MonitorSmartphone, Bus, Smartphone, Trophy, HeartHandshake, FlaskConical, Palette];

/** Facility ke naam se andaaza lagakar icon. */
function facilityIcon(name) {
    const n = name.toLowerCase();
    if (n.includes('science') || n.includes('lab')) return n.includes('computer') ? Computer : FlaskConical;
    if (n.includes('computer') || n.includes('smart')) return Computer;
    if (n.includes('library') || n.includes('book')) return LibraryIcon;
    if (n.includes('sport') || n.includes('ground') || n.includes('gym')) return Dumbbell;
    if (n.includes('music') || n.includes('art') || n.includes('dance')) return n.includes('music') ? Music : Palette;
    if (n.includes('transport') || n.includes('bus')) return Bus;
    if (n.includes('garden') || n.includes('green')) return Leaf;
    return BookOpen;
}

function Eyebrow({ children }) {
    return (
        <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--s-primary)]">
            <Sparkles className="h-3.5 w-3.5" /> {children}
        </p>
    );
}

function Section({ id, alt, children }) {
    return (
        <section id={id} className={alt ? 'bg-[var(--s-bg-2)]' : ''}>
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">{children}</div>
        </section>
    );
}

export function Stats({ stats, afterSlider }) {
    if (!stats) return null;
    const items = [
        [Users, stats.students, 'Happy students'],
        [GraduationCap, stats.teachers, 'Dedicated teachers'],
        [School, stats.classes, 'Classes'],
        stats.years ? [Trophy, stats.years + '+', 'Years of trust'] : null,
    ].filter(Boolean);
    return (
        <div className={(afterSlider ? 'mt-6 ' : '-mt-4 ') + 'relative mx-auto max-w-7xl px-4 sm:px-6'}>
            <div className={'s-card grid grid-cols-2 gap-px overflow-hidden rounded-3xl ' + (items.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
                {items.map(([Icon, value, label]) => (
                    <div key={label} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-6">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--s-primary-soft)] text-[var(--s-primary)] sm:h-12 sm:w-12">
                            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                        </span>
                        <div>
                            <p className="s-heading text-2xl font-extrabold sm:text-3xl">{value}</p>
                            <p className="text-sm text-[var(--s-muted)]">{label}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function About({ school, site }) {
    return (
        <Section id="about">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
                <div>
                    <Eyebrow>About us</Eyebrow>
                    <h2 className="text-3xl font-extrabold sm:text-4xl">
                        A school where every child <span className="s-grad-text">belongs.</span>
                    </h2>
                    <p className="mt-5 whitespace-pre-line text-[17px] leading-relaxed text-[var(--s-muted)]">{site.about}</p>
                    <div className="mt-6 flex flex-wrap gap-2">
                        {site.establishedYear ? (
                            <span className="rounded-full bg-[var(--s-primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--s-primary)]">
                                Since {site.establishedYear}
                            </span>
                        ) : null}
                        {site.affiliation ? (
                            <span className="rounded-full bg-[var(--s-primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--s-primary)]">
                                {site.affiliation}
                            </span>
                        ) : null}
                        {school.session ? (
                            <span className="rounded-full border border-[var(--s-border)] px-3 py-1.5 text-xs font-medium text-[var(--s-muted)]">
                                Session {school.session}
                            </span>
                        ) : null}
                    </div>
                </div>
                {site.principalMessage ? (
                    <figure className="s-card relative overflow-hidden rounded-3xl p-8">
                        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--s-glow)] blur-3xl" />
                        <Quote className="relative h-10 w-10 text-[var(--s-primary)]" />
                        <blockquote className="relative mt-4 whitespace-pre-line text-lg leading-relaxed">{site.principalMessage}</blockquote>
                        <figcaption className="relative mt-6 flex items-center gap-3">
                            {site.principalPhoto ? (
                                <img
                                    src={mediaUrl(site.principalPhoto)}
                                    alt={site.principalName || 'Principal'}
                                    className="h-14 w-14 rounded-full object-cover ring-2 ring-[var(--s-primary)] ring-offset-2 ring-offset-[var(--s-bg)]"
                                />
                            ) : (
                                <span className="s-btn-grad flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold">
                                    {(site.principalName || 'P').split(/\s+/).filter((w) => !w.endsWith('.')).map((w) => w[0]).slice(0, 2).join('')}
                                </span>
                            )}
                            <span>
                                <span className="block font-semibold">{site.principalName || 'Principal'}</span>
                                <span className="block text-sm text-[var(--s-muted)]">Principal</span>
                            </span>
                        </figcaption>
                    </figure>
                ) : null}
            </div>
        </Section>
    );
}

export function Highlights({ site }) {
    if (!site.highlights?.length) return null;
    return (
        <Section id="why" alt>
            <div className="mx-auto max-w-2xl text-center">
                <Eyebrow>Why parents choose us</Eyebrow>
                <h2 className="text-3xl font-extrabold sm:text-4xl">Care, quality and a little extra.</h2>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {site.highlights.map((h, i) => {
                    const Icon = HIGHLIGHT_ICONS[i % HIGHLIGHT_ICONS.length];
                    return (
                        <div key={h.title + i} className="s-card group rounded-3xl p-6 transition-transform duration-300 hover:-translate-y-1">
                            <span className="s-btn-grad flex h-12 w-12 items-center justify-center rounded-2xl">
                                <Icon className="h-6 w-6" />
                            </span>
                            <h3 className="mt-5 text-lg font-bold">{h.title}</h3>
                            {h.text ? <p className="mt-2 text-sm leading-relaxed text-[var(--s-muted)]">{h.text}</p> : null}
                        </div>
                    );
                })}
            </div>
        </Section>
    );
}

export function Campus({ site }) {
    if (!site.facilities?.length) return null;
    return (
        <Section id="campus">
            <div className="grid items-end gap-6 lg:grid-cols-2">
                <div>
                    <Eyebrow>Campus & facilities</Eyebrow>
                    <h2 className="text-3xl font-extrabold sm:text-4xl">Spaces built for curious minds.</h2>
                </div>
                <p className="text-[var(--s-muted)] lg:text-right">Visit us any Saturday to see the campus with your child.</p>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {site.facilities.map((f) => {
                    const Icon = facilityIcon(f);
                    return (
                        <div key={f} className="s-card flex flex-col items-center gap-3 rounded-2xl px-3 py-6 text-center">
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--s-primary-soft)] text-[var(--s-primary)]">
                                <Icon className="h-5 w-5" />
                            </span>
                            <span className="text-sm font-medium">{f}</span>
                        </div>
                    );
                })}
            </div>
        </Section>
    );
}

const fmtDay = (d) => {
    const x = new Date(d);
    return { day: x.getDate(), month: x.toLocaleString('en-IN', { month: 'short' }) };
};

export function News({ notices }) {
    if (!notices?.length) return null;
    return (
        <Section id="news" alt>
            <Eyebrow>News & events</Eyebrow>
            <h2 className="text-3xl font-extrabold sm:text-4xl">What&apos;s happening at school</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {notices.map((n) => {
                    const d = fmtDay(n.eventDate || n.publishOn);
                    return (
                        <article key={n.id} className="s-card flex gap-4 rounded-3xl p-6">
                            <div className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-[var(--s-primary-soft)] text-[var(--s-primary)]">
                                <span className="s-heading text-xl font-extrabold leading-none">{d.day}</span>
                                <span className="mt-1 text-[11px] font-semibold uppercase">{d.month}</span>
                            </div>
                            <div className="min-w-0">
                                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--s-muted)]">
                                    {n.eventDate ? <CalendarDays className="h-3.5 w-3.5" /> : <Megaphone className="h-3.5 w-3.5" />}
                                    {n.category}
                                </p>
                                <h3 className="mt-1 font-bold">{n.title}</h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-[var(--s-muted)]">{n.body}</p>
                            </div>
                        </article>
                    );
                })}
            </div>
        </Section>
    );
}

const STEPS = ['Send an enquiry', 'Campus visit', 'Parent interaction', 'Admission confirmed'];

export function Admissions({ school, site, classes }) {
    return (
        <Section id="admissions">
            <div className="relative overflow-hidden rounded-[32px] border border-[var(--s-border)] bg-[var(--s-bg-2)] p-6 sm:p-10 lg:p-14">
                <div className="pointer-events-none absolute inset-0" style={{ background: 'var(--s-hero)' }} />
                <div className="relative grid gap-10 lg:grid-cols-[1fr_1.1fr]">
                    <div>
                        <Eyebrow>Admissions {school.session || ''}</Eyebrow>
                        <h2 className="text-3xl font-extrabold sm:text-4xl">
                            {site.admissionOpen ? (
                                <>
                                    Give your child the <span className="s-grad-text">right start.</span>
                                </>
                            ) : (
                                'Admissions are closed right now'
                            )}
                        </h2>
                        <p className="mt-4 text-[var(--s-muted)]">
                            {site.admissionNote ||
                                (site.admissionOpen
                                    ? 'Share a few details and our admissions team will call you to explain fees, transport and the next steps.'
                                    : 'Please check back soon or call the school office for the next intake.')}
                        </p>
                        {site.admissionOpen ? (
                            <ol className="mt-8 space-y-4">
                                {STEPS.map((s, i) => (
                                    <li key={s} className="flex items-center gap-4">
                                        <span className="s-btn-grad flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold">{i + 1}</span>
                                        <span className="font-medium">{s}</span>
                                    </li>
                                ))}
                            </ol>
                        ) : null}
                        {school.phone ? (
                            <a href={'tel:' + school.phone} className="mt-8 inline-flex items-center gap-2 font-semibold text-[var(--s-primary)]">
                                <PhoneCall className="h-4 w-4" /> {school.phone}
                            </a>
                        ) : null}
                    </div>
                    {site.admissionOpen ? (
                        <div className="s-card rounded-3xl p-6 sm:p-8">
                            <h3 className="text-xl font-bold">Admission enquiry</h3>
                            <p className="mb-6 mt-1 text-sm text-[var(--s-muted)]">Takes less than a minute.</p>
                            <EnquiryForm slug={school.slug} classes={classes} idPrefix="main" />
                        </div>
                    ) : null}
                </div>
            </div>
        </Section>
    );
}

export function Contact({ school, site }) {
    const s = site.socials || {};
    const address = [school.address, school.city, school.state, school.pincode].filter(Boolean).join(', ');
    const rows = [
        address ? [MapPin, 'Visit us', address, 'https://maps.google.com/?q=' + encodeURIComponent(school.name + ' ' + address)] : null,
        school.phone ? [Phone, 'Call', school.phone, 'tel:' + school.phone] : null,
        school.email ? [Mail, 'Email', school.email, 'mailto:' + school.email] : null,
    ].filter(Boolean);
    const socials = [
        s.facebook ? [Facebook, s.facebook, 'Facebook'] : null,
        s.instagram ? [Instagram, s.instagram, 'Instagram'] : null,
        s.youtube ? [Youtube, s.youtube, 'YouTube'] : null,
        s.whatsapp ? [MessageCircle, 'https://wa.me/91' + s.whatsapp.replace(/\D/g, '').slice(-10), 'WhatsApp'] : null,
    ].filter(Boolean);

    return (
        <Section id="contact" alt>
            <Eyebrow>Contact</Eyebrow>
            <h2 className="text-3xl font-extrabold sm:text-4xl">We&apos;d love to meet you.</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
                {rows.map(([Icon, label, value, href]) => (
                    <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="s-card group flex gap-4 rounded-3xl p-6 transition-colors hover:border-[var(--s-primary)]">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--s-primary-soft)] text-[var(--s-primary)]">
                            <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-xs font-semibold uppercase tracking-wide text-[var(--s-muted)]">{label}</span>
                            <span className="mt-1 block break-words font-medium">{value}</span>
                        </span>
                    </a>
                ))}
            </div>
            {site.showMap && address ? (
                <div className="s-card mt-5 overflow-hidden rounded-3xl">
                    <iframe
                        title={'Map - ' + school.name}
                        src={'https://maps.google.com/maps?q=' + encodeURIComponent(school.name + ', ' + address) + '&z=15&output=embed'}
                        className="h-72 w-full border-0 sm:h-96"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                </div>
            ) : null}
            {socials.length ? (
                <div className="mt-8 flex flex-wrap gap-3">
                    {socials.map(([Icon, href, label]) => (
                        <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--s-border)] bg-[var(--s-surface)] transition-colors hover:border-[var(--s-primary)] hover:text-[var(--s-primary)]">
                            <Icon className="h-5 w-5" />
                        </a>
                    ))}
                </div>
            ) : null}
        </Section>
    );
}

export function Footer({ school }) {
    return (
        <footer className="border-t border-[var(--s-border)]">
            <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center">
                <Logo school={school} />
                <p className="text-sm text-[var(--s-muted)]">
                    © {new Date().getFullYear()} {school.name}. All rights reserved.
                </p>
                <a href="/login" className="text-sm font-medium text-[var(--s-muted)] hover:text-[var(--s-text)]">
                    Staff & parent login
                </a>
            </div>
        </footer>
    );
}

/** Reference jaisa "Before you go" popup - chhota callback form. */
export function CallbackModal({ open, onClose, school, classes, exitIntent }) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="cb-title">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <div className="s-reveal relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[28px] border border-[var(--s-border)] bg-[var(--s-bg)] shadow-2xl sm:rounded-[28px]">
                <div className="relative flex h-24 items-center justify-center overflow-hidden border-b border-[var(--s-border)]" style={{ background: 'var(--s-hero)' }}>
                    <div className="s-grid-bg absolute inset-0" />
                    <span className="s-btn-grad relative flex h-14 w-14 items-center justify-center rounded-2xl">
                        <PhoneCall className="h-6 w-6" />
                    </span>
                    <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--s-border)] bg-[var(--s-surface)] hover:border-[var(--s-primary)]">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="p-6 sm:p-8">
                    <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--s-primary)]">
                        <Sparkles className="h-3.5 w-3.5" /> {exitIntent ? 'Before you go' : 'Quick callback'}
                    </p>
                    <h2 id="cb-title" className="text-2xl font-extrabold leading-tight sm:text-[28px]">
                        Still deciding? Get a clear answer first.
                    </h2>
                    <p className="mb-6 mt-3 text-sm leading-relaxed text-[var(--s-muted)]">
                        Share your number and our admissions team will help you with fees, seats and the next step at {school.name}.
                    </p>
                    <EnquiryForm slug={school.slug} classes={classes} compact idPrefix="cb" />
                </div>
            </div>
        </div>
    );
}

/** Hero ke baad hi dikhta hai - hero me pehle se callback link hai aur slider ke controls se na takraye. */
export function FloatingCallback({ onClick }) {
    const [show, setShow] = useState(false);
    useEffect(() => {
        const on = () => setShow(window.scrollY > window.innerHeight * 0.6);
        on();
        window.addEventListener('scroll', on, { passive: true });
        return () => window.removeEventListener('scroll', on);
    }, []);
    return (
        <button
            onClick={onClick}
            aria-label="Request a callback"
            tabIndex={show ? 0 : -1}
            className={
                's-btn-grad fixed bottom-5 left-5 z-40 flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 ' +
                (show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0')
            }
        >
            <PhoneCall className="h-6 w-6" />
            <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--s-bg)] bg-emerald-400" />
        </button>
    );
}

