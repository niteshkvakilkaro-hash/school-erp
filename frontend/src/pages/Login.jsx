import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
    GraduationCap,
    Loader2,
    ArrowLeft,
    ArrowRight,
    Mail,
    Lock,
    Eye,
    EyeOff,
    ShieldCheck,
    Layers3,
    Users,
    Building2,
    Smartphone,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Left panel ke feature cards - reference design jaisa 2x2 grid
const FEATURES = [
    { icon: Layers3, title: 'Multi-school', sub: 'Ek platform, kai schools' },
    { icon: Users, title: 'Custom roles', sub: 'Permission aapke hisaab se' },
    { icon: Building2, title: 'Tenant-safe', sub: 'Har school ka data alag' },
    { icon: Smartphone, title: 'Parent app', sub: 'Android aur iOS' },
];

// Background me halke-halke tairte hue module chips
const CHIPS = [
    { label: 'Students', top: '12%', left: '4%' },
    { label: 'Attendance', top: '30%', left: '1%' },
    { label: 'Fees', top: '54%', left: '5%' },
    { label: 'Exams', top: '74%', left: '2%' },
    { label: 'Timetable', top: '18%', right: '3%' },
    { label: 'Library', top: '44%', right: '1%' },
    { label: 'Transport', top: '66%', right: '4%' },
];

function FloatingChips() {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden xl:block">
            {CHIPS.map((c) => (
                <div
                    key={c.label}
                    style={{ top: c.top, left: c.left, right: c.right }}
                    className="absolute flex items-center gap-2 rounded-xl border border-brand-400/20 bg-brand-950/60 px-3 py-2 text-xs font-medium text-brand-100 shadow-lg backdrop-blur"
                >
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                    {c.label}
                </div>
            ))}
        </div>
    );
}

export default function Login() {
    const { login, isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [form, setForm] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    // Ek email kai schools me ho to pehle school chunwate hain
    const [schoolChoices, setSchoolChoices] = useState(null);

    if (!loading && isAuthenticated) {
        return <Navigate to={location.state?.from?.pathname || '/'} replace />;
    }

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const attempt = async (schoolCode) => {
        setError('');
        setSubmitting(true);
        try {
            const data = await login(form.email, form.password, schoolCode);
            const target = data.user.schoolId === null ? '/platform' : '/';
            navigate(location.state?.from?.pathname || target, { replace: true });
        } catch (err) {
            if (err.needsSchoolChoice) setSchoolChoices(err.schools);
            else setError(err.message || 'Login nahi ho paaya');
        } finally {
            setSubmitting(false);
        }
    };

    const submit = (e) => {
        e.preventDefault();
        attempt();
    };

    const fieldClass =
        'h-12 w-full rounded-xl border bg-muted/50 pl-11 pr-11 text-sm text-foreground transition-colors ' +
        'placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-ring/40';

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-brand-950 p-4 sm:p-8">
            <FloatingChips />

            <div className="relative grid w-full max-w-5xl overflow-hidden rounded-2xl shadow-2xl lg:grid-cols-2">
                {/* ---------- Left: brand panel ---------- */}
                <div className="relative hidden flex-col justify-between gap-10 bg-sidebar p-10 lg:flex">
                    <div
                        aria-hidden
                        className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/10 blur-2xl"
                    />

                    <div className="relative space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
                                <GraduationCap className="h-6 w-6" />
                            </div>
                            <p className="text-xl font-semibold text-white">
                                ERP<span className="text-brand-400">SC</span>
                            </p>
                        </div>

                        <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/25 bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-200">
                            <Layers3 className="h-3.5 w-3.5" />
                            School Management Platform
                        </span>

                        <h1 className="text-3xl font-semibold leading-snug text-white xl:text-4xl">
                            Ek platform se chalaiye
                            <br />
                            <span className="text-brand-400">poora school</span>, aaraam se.
                        </h1>

                        <p className="max-w-sm text-sm leading-relaxed text-sidebar-foreground/80">
                            Students, teachers, classes, fees aur parents - sab ek hi jagah.
                            Har school ka data poori tarah alag aur surakshit.
                        </p>
                    </div>

                    <div className="relative grid grid-cols-2 gap-3">
                        {FEATURES.map(({ icon: Icon, title, sub }) => (
                            <div
                                key={title}
                                className="rounded-xl border border-sidebar-border bg-brand-950/40 p-4"
                            >
                                <Icon className="mb-2 h-5 w-5 text-brand-400" />
                                <p className="text-sm font-medium text-white">{title}</p>
                                <p className="text-xs text-sidebar-foreground/70">{sub}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ---------- Right: form panel ---------- */}
                <div className="flex flex-col justify-center bg-card p-8 sm:p-10">
                    {/* Mobile par left panel chhupa hota hai - yahan chhota brand dikhate hain */}
                    <div className="mb-8 flex items-center gap-3 lg:hidden">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                            <GraduationCap className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">ERPSC</p>
                            <p className="text-xs text-muted-foreground">School Management Platform</p>
                        </div>
                    </div>

                    {schoolChoices ? (
                        <>
                            <button
                                onClick={() => setSchoolChoices(null)}
                                className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <ArrowLeft className="h-4 w-4" /> Wapas
                            </button>
                            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                                Apna school chuniye
                            </h2>
                            <p className="mt-1.5 text-sm text-muted-foreground">
                                Ye email ek se zyada school me registered hai
                            </p>

                            <div className="mt-6 space-y-2.5">
                                {schoolChoices.map((s) => (
                                    <button
                                        key={s.id}
                                        disabled={submitting}
                                        onClick={() => attempt(s.code)}
                                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent disabled:opacity-50"
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                                                <Building2 className="h-4 w-4" />
                                            </span>
                                            <span>
                                                <span className="block text-sm font-medium text-foreground">
                                                    {s.name}
                                                </span>
                                                <span className="block font-mono text-xs text-muted-foreground">
                                                    {s.code}
                                                </span>
                                            </span>
                                        </span>
                                        {submitting ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        ) : (
                                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                                Welcome back
                            </h2>
                            <p className="mt-1.5 text-sm text-muted-foreground">
                                Apne account se sign in kijiye
                            </p>

                            {error ? (
                                <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                    {error}
                                </div>
                            ) : null}

                            <form onSubmit={submit} className="mt-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label
                                        htmlFor="email"
                                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                                    >
                                        Email address
                                    </label>
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            autoComplete="username"
                                            placeholder="admin@sunrise.com"
                                            value={form.email}
                                            onChange={set('email')}
                                            className={cn(fieldClass, 'border-input')}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label
                                        htmlFor="password"
                                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                                    >
                                        Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            autoComplete="current-password"
                                            placeholder="Apna password daaliye"
                                            value={form.password}
                                            onChange={set('password')}
                                            className={cn(fieldClass, 'border-input')}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((v) => !v)}
                                            aria-label={showPassword ? 'Password chhupaiye' : 'Password dikhaiye'}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <Button type="submit" size="lg" className="w-full gap-2" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                    {submitting ? 'Signing in...' : 'Sign In'}
                                </Button>
                            </form>

                            <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                                <Lock className="h-3 w-3" /> Secured &middot; encrypted sign in
                            </p>

                            <div className="mt-6 space-y-1 rounded-xl border border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
                                <p className="mb-1 font-semibold text-foreground">Demo accounts</p>
                                <p>Super Admin &mdash; admin@school.com / admin123</p>
                                <p>School Admin &mdash; admin@sunrise.com / admin123</p>
                                <p>Teacher &mdash; anita.sharma@sunrise.com / teacher123</p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
