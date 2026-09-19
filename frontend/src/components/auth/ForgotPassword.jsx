import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Mail, KeyRound, Lock, Building2, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const fieldClass =
    'h-12 w-full rounded-xl border border-input bg-muted/50 pl-11 pr-4 text-sm text-foreground transition-colors ' +
    'placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-ring/40';

function Field({ id, label, icon: Icon, error, ...props }) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
            </label>
            <div className="relative">
                <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input id={id} name={id} className={cn(fieldClass, error && 'border-destructive')} aria-invalid={Boolean(error)} {...props} />
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
    );
}

/**
 * Password bhool gaye: email -> registered mobile par OTP -> OTP + naya password.
 * Login page ke andar hi chalta hai (onDone par wapas login, email bhara hua).
 */
export function ForgotPassword({ initialEmail = '', onBack, onDone }) {
    const [step, setStep] = useState('email'); // email | school | otp | done
    const [email, setEmail] = useState(initialEmail);
    const [schoolCode, setSchoolCode] = useState('');
    const [schools, setSchools] = useState([]);
    const [sent, setSent] = useState(null); // { ref, phoneHint, demoOtp }
    const [otp, setOtp] = useState('');
    const [pwd, setPwd] = useState({ newPassword: '', confirm: '' });
    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [wait, setWait] = useState(0);

    // "Dobara bhejiye" 30 sec baad
    useEffect(() => {
        if (wait <= 0) return undefined;
        const t = setTimeout(() => setWait((w) => w - 1), 1000);
        return () => clearTimeout(t);
    }, [wait]);

    const requestOtp = async (code = schoolCode) => {
        setBusy(true);
        setError('');
        setErrors({});
        try {
            const body = { email };
            if (code) body.schoolCode = code;
            const { data } = await api.post('/auth/forgot-password', body);
            setSent(data.data);
            setOtp('');
            setStep('otp');
            setWait(30);
        } catch (err) {
            if (err.needsSchoolChoice) {
                const { data } = await api.get('/auth/schools').catch(() => ({ data: { data: [] } }));
                setSchools(data.data || []);
                setStep('school');
            } else {
                setErrors(err.fieldErrors || {});
                setError(err.message);
            }
        } finally {
            setBusy(false);
        }
    };

    const reset = async (e) => {
        e.preventDefault();
        if (pwd.newPassword !== pwd.confirm) return setErrors({ confirm: 'Dono password same hone chahiye' });
        setBusy(true);
        setError('');
        setErrors({});
        try {
            await api.post('/auth/forgot-password/reset', { ref: sent.ref, otp, newPassword: pwd.newPassword });
            setStep('done');
        } catch (err) {
            setErrors(err.fieldErrors || {});
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            {step !== 'done' ? (
                <button
                    type="button"
                    onClick={step === 'email' ? onBack : () => { setStep('email'); setError(''); }}
                    className="mb-5 inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" /> Wapas
                </button>
            ) : null}

            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                {step === 'done' ? 'Password badal gaya' : step === 'school' ? 'Apna school chuniye' : 'Password bhool gaye?'}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
                {step === 'email' && 'Apna login email daaliye - registered mobile par OTP aayega'}
                {step === 'school' && 'Ye email ek se zyada school me hai'}
                {step === 'otp' && 'OTP ' + (sent?.phoneHint || '') + ' par bheja gaya (10 minute valid)'}
                {step === 'done' && 'Ab naye password se login kijiye. Baaki devices se logout ho gaya hai.'}
            </p>

            {error ? (
                <div role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            {step === 'email' ? (
                <form
                    className="mt-6 space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        setSchoolCode('');
                        requestOtp('');
                    }}
                >
                    <Field id="fp-email" label="Email address" icon={Mail} type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
                    <Button type="submit" size="lg" className="w-full gap-2" disabled={busy}>
                        {busy ? <Loader2 className="animate-spin" /> : <KeyRound className="h-4 w-4" />} OTP bhejiye
                    </Button>
                </form>
            ) : null}

            {step === 'school' ? (
                <div className="mt-6 space-y-2.5">
                    {schools.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            disabled={busy}
                            onClick={() => {
                                setSchoolCode(s.code);
                                requestOtp(s.code);
                            }}
                            className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent disabled:opacity-50"
                        >
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                                <Building2 className="h-4 w-4" />
                            </span>
                            <span>
                                <span className="block text-sm font-medium text-foreground">{s.name}</span>
                                <span className="block font-mono text-xs text-muted-foreground">{s.code}</span>
                            </span>
                        </button>
                    ))}
                </div>
            ) : null}

            {step === 'otp' ? (
                <form className="mt-6 space-y-4" onSubmit={reset}>
                    {sent?.demoOtp ? (
                        <div className="rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
                            Demo mode (asli SMS nahi gaya) - OTP: <span className="font-mono font-semibold tracking-widest">{sent.demoOtp}</span>
                        </div>
                    ) : null}
                    <Field
                        id="fp-otp"
                        label="OTP"
                        icon={KeyRound}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        required
                        placeholder="6 digit"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        error={errors.otp}
                    />
                    <Field id="fp-new" label="Naya password" icon={Lock} type="password" required minLength={6} autoComplete="new-password" value={pwd.newPassword} onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))} error={errors.newPassword} />
                    <Field id="fp-confirm" label="Password dobara" icon={Lock} type="password" required autoComplete="new-password" value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} error={errors.confirm} />
                    <Button type="submit" size="lg" className="w-full gap-2" disabled={busy || otp.length !== 6}>
                        {busy ? <Loader2 className="animate-spin" /> : <Lock className="h-4 w-4" />} Password badliye
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                        OTP nahi aaya?{' '}
                        <button type="button" disabled={wait > 0 || busy} onClick={() => requestOtp()} className="font-medium text-primary disabled:text-muted-foreground">
                            {wait > 0 ? 'Dobara bhejiye (' + wait + 's)' : 'Dobara bhejiye'}
                        </button>
                    </p>
                </form>
            ) : null}

            {step === 'done' ? (
                <div className="mt-6 space-y-5">
                    <div className="flex justify-center">
                        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary">
                            <CheckCircle2 className="h-8 w-8" />
                        </span>
                    </div>
                    <Button size="lg" className="w-full" onClick={() => onDone(email)}>
                        Login par jaiye
                    </Button>
                </div>
            ) : null}
        </>
    );
}
