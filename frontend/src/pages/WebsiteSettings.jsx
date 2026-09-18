import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Save, ExternalLink, Copy, Check, Plus, Trash2, Globe, Eye } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TextField, TextareaField } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import { SITE_THEMES } from '@/site/themes';

function Toggle({ checked, onChange, label, hint }) {
    return (
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border p-4">
            <span>
                <span className="block text-sm font-medium text-foreground">{label}</span>
                {hint ? <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span> : null}
            </span>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={cn(
                    'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors',
                    checked ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
            >
                <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
            </button>
        </label>
    );
}

/** Theme card ke andar website ka chhota sa namoona. */
function ThemeMock({ theme }) {
    const [bg, primary, accent] = theme.swatch;
    const text = theme.dark ? '#ecebf8' : '#0f172a';
    const line = theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.1)';
    return (
        <div className="relative h-28 overflow-hidden rounded-lg" style={{ background: bg }}>
            <div className="absolute right-2 top-5 h-16 w-16 rounded-full blur-2xl" style={{ background: primary, opacity: 0.35 }} />
            <div className="flex items-center justify-between px-3 pt-2.5">
                <span className="h-2 w-8 rounded-full" style={{ background: line }} />
                <span className="h-3 w-9 rounded" style={{ background: 'linear-gradient(90deg,' + primary + ',' + accent + ')' }} />
            </div>
            <div className="px-3 pt-4">
                <span className="block h-2.5 w-20 rounded-full" style={{ background: text, opacity: 0.85 }} />
                <span className="mt-1.5 block h-2.5 w-24 rounded-full" style={{ background: 'linear-gradient(90deg,' + primary + ',' + accent + ')' }} />
                <span className="mt-2.5 block h-1.5 w-28 rounded-full" style={{ background: line }} />
            </div>
            <div className="absolute bottom-3 right-4 h-9 w-9 rotate-45 rounded-lg p-[1.5px]" style={{ background: 'linear-gradient(135deg,' + primary + ',' + accent + ')' }}>
                <div className="h-full w-full rounded-[7px]" style={{ background: bg }} />
            </div>
        </div>
    );
}

export default function WebsiteSettings() {
    const [site, setSite] = useState(null);
    const [school, setSchool] = useState(null);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [facility, setFacility] = useState('');

    useEffect(() => {
        api.get('/website')
            .then(({ data }) => {
                setSite(data.data.site);
                setSchool(data.data.school);
            })
            .catch((err) => toast.error(err.message));
    }, []);

    if (!site) return <p className="py-20 text-center text-sm text-muted-foreground">Loading...</p>;

    const url = window.location.origin + '/site/' + school.slug;
    const set = (k) => (e) => setSite((s) => ({ ...s, [k]: e?.target ? e.target.value : e }));

    const save = async (patch = {}) => {
        setSaving(true);
        setErrors({});
        const body = { ...site, ...patch };
        try {
            const { data } = await api.put('/website', {
                published: body.published,
                theme: body.theme,
                tagline: body.tagline || '',
                heroTitle: body.heroTitle || '',
                heroHighlight: body.heroHighlight || '',
                heroSubtitle: body.heroSubtitle || '',
                about: body.about || '',
                establishedYear: body.establishedYear || '',
                affiliation: body.affiliation || '',
                principalName: body.principalName || '',
                principalMessage: body.principalMessage || '',
                highlights: body.highlights.filter((h) => h.title.trim()),
                facilities: body.facilities,
                socials: body.socials,
                showStats: body.showStats,
                admissionOpen: body.admissionOpen,
                admissionNote: body.admissionNote || '',
            });
            setSite(data.data);
            toast.success(data.message);
        } catch (err) {
            setErrors(err.fieldErrors || {});
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error('Copy nahi ho paya');
        }
    };

    const setHighlight = (i, k, v) =>
        setSite((s) => ({ ...s, highlights: s.highlights.map((h, j) => (j === i ? { ...h, [k]: v } : h)) }));

    const addFacility = () => {
        const v = facility.trim();
        if (!v) return;
        if (site.facilities.some((f) => f.toLowerCase() === v.toLowerCase())) return toast.error('Ye pehle se hai');
        setSite((s) => ({ ...s, facilities: [...s.facilities, v] }));
        setFacility('');
    };

    const social = (k) => (e) => setSite((s) => ({ ...s, socials: { ...s.socials, [k]: e.target.value } }));

    return (
        <div className="pb-10">
            <PageHeader
                title="Website"
                subtitle="School ki public website - theme, content aur admission enquiry form"
                actions={
                    <>
                        <Button variant="outline" onClick={() => window.open(url, '_blank')}>
                            {site.published ? <ExternalLink /> : <Eye />} {site.published ? 'Open website' : 'Preview'}
                        </Button>
                        <Button onClick={() => save()} disabled={saving}>
                            <Save /> {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </>
                }
            />

            <div className="grid gap-6 xl:grid-cols-3">
                <div className="space-y-6 xl:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Theme</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            {SITE_THEMES.map((t) => {
                                const on = site.theme === t.key;
                                return (
                                    <div
                                        key={t.key}
                                        className={cn(
                                            'rounded-xl border p-3 transition-colors',
                                            on ? 'border-primary ring-2 ring-primary/25' : 'border-border hover:border-primary/50'
                                        )}
                                    >
                                        <button type="button" className="block w-full text-left" onClick={() => set('theme')(t.key)}>
                                            <ThemeMock theme={t} />
                                            <span className="mt-3 flex items-center justify-between">
                                                <span className="font-medium text-foreground">{t.name}</span>
                                                {on ? <Badge>Selected</Badge> : null}
                                            </span>
                                            <span className="mt-0.5 block text-xs text-muted-foreground">{t.description}</span>
                                        </button>
                                        <a
                                            href={url + '?theme=' + t.key}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                        >
                                            <Eye className="h-3.5 w-3.5" /> Is theme me dekhiye
                                        </a>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Hero (sabse upar ka hissa)</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            <TextField label="Tagline" name="tagline" className="sm:col-span-2" placeholder="Admissions open for 2026-27" value={site.tagline || ''} onChange={set('tagline')} error={errors.tagline} />
                            <TextField label="Heading - pehli line" name="heroTitle" placeholder="Learn today." value={site.heroTitle || ''} onChange={set('heroTitle')} error={errors.heroTitle} />
                            <TextField label="Heading - rangeen line" name="heroHighlight" placeholder="Lead tomorrow." value={site.heroHighlight || ''} onChange={set('heroHighlight')} error={errors.heroHighlight} hint="Theme ke gradient me dikhegi" />
                            <TextareaField label="Chhota introduction" name="heroSubtitle" rows={2} className="sm:col-span-2" value={site.heroSubtitle || ''} onChange={set('heroSubtitle')} error={errors.heroSubtitle} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>About aur principal</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            <TextareaField label="About school" name="about" rows={4} className="sm:col-span-2" value={site.about || ''} onChange={set('about')} error={errors.about} />
                            <TextField label="Established (saal)" name="establishedYear" type="number" placeholder="2004" value={site.establishedYear || ''} onChange={set('establishedYear')} error={errors.establishedYear} />
                            <TextField label="Board / affiliation" name="affiliation" placeholder="CBSE affiliated" value={site.affiliation || ''} onChange={set('affiliation')} error={errors.affiliation} />
                            <TextField label="Principal ka naam" name="principalName" value={site.principalName || ''} onChange={set('principalName')} error={errors.principalName} />
                            <TextareaField label="Principal ka message" name="principalMessage" rows={3} className="sm:col-span-2" value={site.principalMessage || ''} onChange={set('principalMessage')} error={errors.principalMessage} hint="Khaali = ye card nahi dikhega" />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle>Why choose us ({site.highlights.length}/8)</CardTitle>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={site.highlights.length >= 8}
                                onClick={() => setSite((s) => ({ ...s, highlights: [...s.highlights, { title: '', text: '' }] }))}
                            >
                                <Plus /> Add
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {site.highlights.map((h, i) => (
                                <div key={i} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_2fr_auto]">
                                    <Input placeholder="Title" value={h.title} maxLength={60} onChange={(e) => setHighlight(i, 'title', e.target.value)} aria-label={'Highlight ' + (i + 1) + ' title'} />
                                    <Input placeholder="Ek line" value={h.text} maxLength={240} onChange={(e) => setHighlight(i, 'text', e.target.value)} aria-label={'Highlight ' + (i + 1) + ' text'} />
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        title="Remove"
                                        className="text-destructive hover:bg-destructive/10"
                                        onClick={() => setSite((s) => ({ ...s, highlights: s.highlights.filter((_, j) => j !== i) }))}
                                    >
                                        <Trash2 />
                                    </Button>
                                </div>
                            ))}
                            {!site.highlights.length ? <p className="text-sm text-muted-foreground">Koi highlight nahi - section chhup jayega</p> : null}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Campus facilities</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {site.facilities.map((f) => (
                                    <span key={f} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 py-1 pl-3 pr-1.5 text-sm">
                                        {f}
                                        <button
                                            type="button"
                                            aria-label={'Remove ' + f}
                                            onClick={() => setSite((s) => ({ ...s, facilities: s.facilities.filter((x) => x !== f) }))}
                                            className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="mt-3 flex gap-2">
                                <Input
                                    placeholder="e.g. Swimming pool"
                                    value={facility}
                                    maxLength={60}
                                    onChange={(e) => setFacility(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addFacility();
                                        }
                                    }}
                                />
                                <Button variant="outline" onClick={addFacility} disabled={site.facilities.length >= 16}>
                                    <Plus /> Add
                                </Button>
                            </div>
                            {errors.facilities ? <p className="mt-2 text-xs text-destructive">{errors.facilities}</p> : null}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="h-4 w-4" /> Publish
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-2 pl-3">
                                <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{url}</span>
                                <Button size="icon-sm" variant="ghost" onClick={copy} title="Copy link">
                                    {copied ? <Check /> : <Copy />}
                                </Button>
                            </div>
                            <Toggle
                                label={site.published ? 'Website live hai' : 'Website band hai'}
                                hint={site.published ? 'Koi bhi link se dekh sakta hai' : 'Sirf aap preview kar sakte hain'}
                                checked={site.published}
                                onChange={(v) => {
                                    set('published')(v);
                                    save({ published: v });
                                }}
                            />
                            <Toggle label="Admission enquiry form" hint="Band karne par form aur callback button chhup jayenge" checked={site.admissionOpen} onChange={set('admissionOpen')} />
                            <Toggle label="Numbers dikhaiye" hint="Students, teachers, classes - live ginti" checked={site.showStats} onChange={set('showStats')} />
                            <TextareaField label="Admission note" name="admissionNote" rows={2} placeholder="Nursery to Class 10 - limited seats" value={site.admissionNote || ''} onChange={set('admissionNote')} error={errors.admissionNote} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Social links</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <TextField label="Facebook" name="facebook" placeholder="https://facebook.com/..." value={site.socials.facebook || ''} onChange={social('facebook')} error={errors['socials.facebook']} />
                            <TextField label="Instagram" name="instagram" placeholder="https://instagram.com/..." value={site.socials.instagram || ''} onChange={social('instagram')} error={errors['socials.instagram']} />
                            <TextField label="YouTube" name="youtube" placeholder="https://youtube.com/..." value={site.socials.youtube || ''} onChange={social('youtube')} error={errors['socials.youtube']} />
                            <TextField label="WhatsApp number" name="whatsapp" placeholder="98260 00000" value={site.socials.whatsapp || ''} onChange={social('whatsapp')} error={errors['socials.whatsapp']} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="space-y-1 p-5 text-sm text-muted-foreground">
                            <p className="font-medium text-foreground">Aur kya dikhta hai</p>
                            <p>Address, phone aur email - School Settings se.</p>
                            <p>News & events - jin notices par &quot;Website par bhi dikhaiye&quot; tick hai.</p>
                            <p>Enquiry form se aayi har request Admissions me &quot;Website&quot; source ke saath.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
