import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Eye, Palette } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import '@/site/site.css';
import { SITE_THEMES, themeByKey } from '@/site/themes';
import { Nav, Hero } from '@/site/Hero';
import {
    Stats, About, Highlights, Campus, News, Admissions, Contact, Footer, CallbackModal, FloatingCallback,
} from '@/site/Sections';
import { Gallery, Videos, parseVideo } from '@/site/Media';
import { Testimonials, Faq } from '@/site/More';

/** Admin preview me neeche-daayein theme badal kar dekhne ka switcher. */
function ThemeSwitcher({ value, onChange }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="fixed bottom-5 right-5 z-40">
            {open ? (
                <div className="s-card mb-3 w-60 rounded-2xl p-2">
                    {SITE_THEMES.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => onChange(t.key)}
                            className={cn(
                                'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm',
                                value === t.key ? 'bg-[var(--s-primary-soft)]' : 'hover:bg-[var(--s-surface-2)]'
                            )}
                        >
                            <span className="flex overflow-hidden rounded-full border border-[var(--s-border)]">
                                {t.swatch.map((c) => (
                                    <span key={c} className="h-5 w-3" style={{ background: c }} />
                                ))}
                            </span>
                            {t.name}
                        </button>
                    ))}
                </div>
            ) : null}
            <button
                onClick={() => setOpen((v) => !v)}
                className="s-card ml-auto flex h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold"
            >
                <Palette className="h-4 w-4 text-[var(--s-primary)]" /> Theme
            </button>
        </div>
    );
}

export default function SchoolSite() {
    const { slug } = useParams();
    const [params, setParams] = useSearchParams();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [callback, setCallback] = useState(null); // null | 'click' | 'exit'

    useEffect(() => {
        api.get('/public/sites/' + slug)
            .then(({ data: res }) => setData(res.data))
            .catch((err) => setError(err));
    }, [slug]);

    const override = params.get('theme');
    const theme = themeByKey(override || data?.site.theme).key;

    const setTheme = (k) => {
        const next = new URLSearchParams(params);
        next.set('theme', k);
        setParams(next, { replace: true });
    };

    useEffect(() => {
        if (!data) return;
        document.title = data.school.name + (data.school.city ? ' - ' + data.school.city : '');
        const meta = document.querySelector('meta[name=theme-color]');
        const before = meta?.content;
        if (meta) meta.content = themeByKey(theme).swatch[0];
        return () => {
            document.title = 'ERPSC - School Management';
            if (meta && before) meta.content = before;
        };
    }, [data, theme]);

    // "Before you go" - desktop par cursor tab-bar ki taraf jaye to ek baar
    const openExit = useCallback(() => setCallback((c) => c || 'exit'), []);
    useEffect(() => {
        if (!data?.site.admissionOpen) return undefined;
        const key = 'site-exit-' + slug;
        let armed = false;
        const t = setTimeout(() => (armed = true), 6000);
        const onOut = (e) => {
            if (!armed || e.relatedTarget || e.clientY > 0) return;
            try {
                if (sessionStorage.getItem(key)) return;
                sessionStorage.setItem(key, '1');
            } catch {
                /* private mode - phir bhi ek baar dikha do */
            }
            armed = false;
            openExit();
        };
        document.addEventListener('mouseout', onOut);
        return () => {
            clearTimeout(t);
            document.removeEventListener('mouseout', onOut);
        };
    }, [data, slug, openExit]);

    if (error) {
        return (
            <div className="site flex min-h-screen flex-col items-center justify-center px-6 text-center" data-theme="emerald">
                <p className="s-grad-text text-6xl font-extrabold">404</p>
                <h1 className="mt-4 text-2xl font-extrabold">Website not available</h1>
                <p className="mt-2 max-w-md text-[var(--s-muted)]">
                    {error.status === 404 ? 'This school website is not published yet, or the link is incorrect.' : error.message}
                </p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="site flex min-h-screen items-center justify-center" data-theme={override || 'emerald'}>
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--s-border)] border-t-[var(--s-primary)]" />
            </div>
        );
    }

    const { school, site, stats, classes, notices, preview, slides, gallery } = data;
    const has = {
        gallery: gallery?.length > 0,
        videos: (site.videos || []).some((v) => parseVideo(v.url)),
        news: notices?.length > 0,
    };
    const openCallback = () => setCallback('click');

    return (
        <div className="site" data-theme={theme}>
            {preview ? (
                <div className="flex items-center justify-center gap-2 bg-amber-400 px-4 py-2 text-center text-xs font-semibold text-amber-950">
                    <Eye className="h-4 w-4" /> Preview - website abhi publish nahi hai, sirf aap dekh rahe hain
                </div>
            ) : null}
            <Nav school={school} site={site} has={has} onCallback={openCallback} />
            <main>
                <Hero school={school} site={site} slides={slides} onCallback={openCallback} />
                <Stats stats={stats} afterSlider={slides?.length > 0} />
                <About school={school} site={site} />
                <Highlights site={site} />
                <Campus site={site} />
                <Gallery items={gallery} />
                <Videos videos={site.videos} />
                <Testimonials items={site.testimonials} />
                <News notices={notices} />
                <Admissions school={school} site={site} classes={classes} />
                <Faq items={site.faqs} school={school} />
                <Contact school={school} site={site} />
            </main>
            <Footer school={school} />

            {site.admissionOpen ? <FloatingCallback onClick={openCallback} /> : null}
            {preview || override ? <ThemeSwitcher value={theme} onChange={setTheme} /> : null}
            <CallbackModal
                open={Boolean(callback)}
                exitIntent={callback === 'exit'}
                onClose={() => setCallback(null)}
                school={school}
                classes={classes}
            />
        </div>
    );
}
