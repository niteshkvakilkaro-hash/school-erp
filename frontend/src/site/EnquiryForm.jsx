import { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, MessageCircle } from 'lucide-react';
import api from '@/lib/api';

const BLANK = { studentName: '', classId: '', parentName: '', phone: '', email: '', message: '', website: '' };

function Label({ children, optional, htmlFor }) {
    return (
        <label htmlFor={htmlFor} className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[var(--s-text)]">
            {children}
            {optional ? <span className="font-normal text-[var(--s-muted)]">Optional</span> : null}
        </label>
    );
}

/**
 * Admission enquiry - seedha school ke Admissions module me "website" source
 * ke saath jaati hai. compact = popup wala chhota form.
 */
export function EnquiryForm({ slug, classes, compact = false, idPrefix = 'enq', onDone }) {
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(null);
    const [failed, setFailed] = useState('');

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const id = (k) => idPrefix + '-' + k;

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        setFailed('');
        try {
            const { data } = await api.post('/public/sites/' + slug + '/enquiry', form);
            setDone(data);
            setForm(BLANK);
            onDone?.(data);
        } catch (err) {
            setErrors(err.fieldErrors || {});
            setFailed(err.message);
        } finally {
            setBusy(false);
        }
    };

    if (done) {
        return (
            <div className="flex flex-col items-center py-6 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--s-primary-soft)] text-[var(--s-primary)]">
                    <CheckCircle2 className="h-7 w-7" />
                </span>
                <p className="s-heading mt-4 text-lg font-bold">Request received</p>
                <p className="mt-1 max-w-sm text-sm text-[var(--s-muted)]">{done.message}</p>
                {done.data?.reference ? (
                    <p className="mt-3 rounded-full border border-[var(--s-border)] px-3 py-1 font-mono text-xs text-[var(--s-muted)]">
                        Reference {done.data.reference}
                    </p>
                ) : null}
                <button type="button" onClick={() => setDone(null)} className="mt-4 text-sm font-medium text-[var(--s-primary)] hover:underline">
                    Enquire for another child
                </button>
            </div>
        );
    }

    const err = (k) => (errors[k] ? <p className="mt-1 text-xs text-rose-500">{errors[k]}</p> : null);

    return (
        <form onSubmit={submit} noValidate className="space-y-4">
            <div className={compact ? 'space-y-4' : 'grid gap-4 sm:grid-cols-2'}>
                <div>
                    <Label htmlFor={id('student')}>Child&apos;s name</Label>
                    <input id={id('student')} className="s-input" placeholder="e.g. Aarav Sharma" value={form.studentName} onChange={set('studentName')} autoComplete="off" />
                    {err('studentName')}
                </div>
                <div>
                    <Label htmlFor={id('class')}>Class</Label>
                    <select id={id('class')} className="s-input" value={form.classId} onChange={set('classId')}>
                        <option value="">Select class</option>
                        {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                    {err('classId')}
                </div>
                <div>
                    <Label htmlFor={id('phone')}>Phone / WhatsApp</Label>
                    <input id={id('phone')} className="s-input" type="tel" inputMode="tel" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} autoComplete="tel" />
                    {err('phone')}
                </div>
                <div>
                    <Label htmlFor={id('parent')} optional>
                        Parent&apos;s name
                    </Label>
                    <input id={id('parent')} className="s-input" placeholder="Your name" value={form.parentName} onChange={set('parentName')} autoComplete="name" />
                    {err('parentName')}
                </div>
                {!compact ? (
                    <>
                        <div className="sm:col-span-2">
                            <Label htmlFor={id('email')} optional>
                                Email
                            </Label>
                            <input id={id('email')} className="s-input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} autoComplete="email" />
                            {err('email')}
                        </div>
                        <div className="sm:col-span-2">
                            <Label htmlFor={id('msg')} optional>
                                Anything you&apos;d like to ask?
                            </Label>
                            <textarea id={id('msg')} rows={3} className="s-input resize-none" placeholder="Fees, transport, campus visit..." value={form.message} onChange={set('message')} />
                        </div>
                    </>
                ) : null}
            </div>

            {/* Spam trap - screen par nahi dikhta */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} className="hidden" aria-hidden="true" />

            {failed && !Object.keys(errors).length ? <p className="text-sm text-rose-500">{failed}</p> : null}

            <button type="submit" disabled={busy} className="s-btn-grad flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold disabled:opacity-70">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {compact ? 'Request a callback' : 'Send enquiry'}
                {!busy ? compact ? <MessageCircle className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" /> : null}
            </button>
            <p className="text-center text-[11px] text-[var(--s-muted)]">
                No obligation. We use these details only to respond to your enquiry.
            </p>
        </form>
    );
}
