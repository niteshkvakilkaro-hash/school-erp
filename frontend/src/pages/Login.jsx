import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { School, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';

export default function Login() {
    const { login, isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [form, setForm] = useState({ email: '', password: '' });
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
            if (err.needsSchoolChoice) {
                setSchoolChoices(err.schools);
            } else {
                setError(err.message || 'Login nahi ho paaya');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const submit = (e) => {
        e.preventDefault();
        attempt();
    };

    return (
        <div className="grid min-h-screen lg:grid-cols-2">
            <div className="relative hidden flex-col justify-between bg-sidebar p-12 lg:flex">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
                        <School className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-lg font-semibold text-white">ERPSC</p>
                        <p className="text-xs text-sidebar-foreground/70">
                            Multi-school management platform
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="max-w-md text-3xl font-semibold leading-snug text-white">
                        Kai schools, ek platform.
                    </h2>
                    <p className="max-w-md text-sm leading-relaxed text-sidebar-foreground/80">
                        Har school ka data poori tarah alag. Roles aur permissions har school
                        apne hisaab se set karta hai - aur parents ko mobile app par sab dikhta hai.
                    </p>
                </div>

                <p className="text-xs text-sidebar-foreground/50">
                    &copy; {new Date().getFullYear()} ERPSC. All rights reserved.
                </p>
            </div>

            <div className="flex items-center justify-center bg-background px-5 py-12">
                <div className="w-full max-w-sm">
                    <div className="mb-8 flex items-center gap-3 lg:hidden">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                            <School className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">ERPSC</p>
                            <p className="text-xs text-muted-foreground">School Management</p>
                        </div>
                    </div>

                    {schoolChoices ? (
                        <>
                            <button
                                onClick={() => setSchoolChoices(null)}
                                className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                            >
                                <ArrowLeft className="h-4 w-4" /> Wapas
                            </button>
                            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                                Apna school chuniye
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Ye email ek se zyada school me registered hai
                            </p>

                            <div className="mt-6 space-y-2">
                                {schoolChoices.map((s) => (
                                    <button
                                        key={s.id}
                                        disabled={submitting}
                                        onClick={() => attempt(s.code)}
                                        className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
                                    >
                                        <span>
                                            <span className="block text-sm font-medium text-foreground">
                                                {s.name}
                                            </span>
                                            <span className="block text-xs text-muted-foreground">
                                                {s.code}
                                            </span>
                                        </span>
                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                                Welcome back
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Apne account se login kijiye
                            </p>

                            {error ? (
                                <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                    {error}
                                </div>
                            ) : null}

                            <form onSubmit={submit} className="mt-6 space-y-4">
                                <TextField
                                    label="Email"
                                    name="email"
                                    type="email"
                                    required
                                    autoComplete="username"
                                    placeholder="admin@sunrise.com"
                                    value={form.email}
                                    onChange={set('email')}
                                />
                                <TextField
                                    label="Password"
                                    name="password"
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                    placeholder="........"
                                    value={form.password}
                                    onChange={set('password')}
                                />

                                <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin" /> : null}
                                    {submitting ? 'Signing in...' : 'Sign in'}
                                </Button>
                            </form>

                            <div className="mt-8 space-y-1 rounded-lg border border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
                                <p className="mb-1 font-medium text-foreground">Demo accounts</p>
                                <p>Super Admin: admin@school.com / admin123</p>
                                <p>School Admin: admin@sunrise.com / admin123</p>
                                <p>Teacher: anita.sharma@sunrise.com / teacher123</p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
