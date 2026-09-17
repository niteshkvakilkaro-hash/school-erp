import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
    GraduationCap, Users, School, UserPlus, CalendarDays, ArrowRight, ClipboardCheck, Wallet,
} from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/StatCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { formatCurrency, formatDate, fullName, titleCase } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const PIE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-5)'];

const TOOLTIP_STYLE = {
    background: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: '0.5rem',
    color: 'var(--popover-foreground)',
    fontSize: 12,
};

const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
};

/** "2 hours ago" jaisa relative time. */
function timeAgo(date) {
    const mins = Math.round((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'abhi';
    if (mins < 60) return mins + ' min ago';
    const hours = Math.round(mins / 60);
    if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
    const days = Math.round(hours / 24);
    return days + (days === 1 ? ' day ago' : ' days ago');
}

const ACTIVITY_TONE = {
    admission: 'bg-accent text-accent-foreground',
    teacher: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
};

export default function Dashboard() {
    const { user, school } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/dashboard/stats')
            .then(({ data: res }) => setData(res.data))
            .finally(() => setLoading(false));
    }, []);

    const counts = data?.counts || {};
    const growth = data?.growth || {};
    const seats = data?.seats || {};
    const att = data?.attendanceToday;
    const fees = data?.fees;
    const today = new Date().toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    return (
        <div className="space-y-6">
            {/* ---------- Greeting + session strip ---------- */}
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-gradient-to-r from-accent/60 to-card p-5">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                        {greeting()}, {user?.name?.split(' ')[0] || 'User'}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Aaj aapke school me kya chal raha hai - ek nazar me.
                    </p>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <CalendarDays className="h-5 w-5" />
                    </span>
                    <div className="leading-tight">
                        <p className="text-sm font-medium text-foreground">{today}</p>
                        <p className="text-xs text-muted-foreground">
                            Academic Year {school?.session || '-'}
                        </p>
                    </div>
                </div>
            </div>

            {/* ---------- Stat cards ---------- */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    icon={GraduationCap}
                    tone="brand"
                    label="Total Students"
                    value={loading ? '-' : counts.students ?? 0}
                    percent={growth.students?.percent}
                    hint={
                        growth.students
                            ? '+' + growth.students.addedLast30Days + ' pichhle 30 din me'
                            : undefined
                    }
                />
                <StatCard
                    icon={Users}
                    tone="violet"
                    label="Total Teachers"
                    value={loading ? '-' : counts.teachers ?? 0}
                    percent={growth.teachers?.percent}
                    hint={
                        growth.teachers
                            ? '+' + growth.teachers.addedLast30Days + ' pichhle 30 din me'
                            : undefined
                    }
                />
                <StatCard
                    icon={Wallet}
                    tone="blue"
                    label="Fee Collection"
                    value={loading ? '-' : formatCurrency(fees?.collected ?? 0)}
                    hint={
                        loading
                            ? undefined
                            : fees?.totalFee
                              ? fees.percent + '% collected, ' + formatCurrency(fees.pending) + ' pending'
                              : 'Abhi koi fee assign nahi hui'
                    }
                />
                <StatCard
                    icon={ClipboardCheck}
                    tone="amber"
                    label="Attendance Today"
                    value={loading ? '-' : att?.percent != null ? att.percent + '%' : 'Not marked'}
                    hint={
                        loading
                            ? undefined
                            : att?.marked
                              ? att.marked + ' marked · ' + att.counts.absent + ' absent'
                              : 'Aaj ki attendance abhi baaki hai'
                    }
                />
            </div>

            {/* ---------- Charts ---------- */}
            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Admissions - pichhle 6 mahine</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                        {loading ? (
                            <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data?.admissionsTrend || []}>
                                    <defs>
                                        <linearGradient id="admGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                                            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                                        axisLine={{ stroke: 'var(--border)' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        name="Admissions"
                                        stroke="var(--chart-1)"
                                        strokeWidth={2.5}
                                        fill="url(#admGrad)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Gender split</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                        {loading ? (
                            <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data?.genderSplit || []}
                                        dataKey="count"
                                        nameKey="gender"
                                        innerRadius={52}
                                        outerRadius={80}
                                        paddingAngle={3}
                                    >
                                        {(data?.genderSplit || []).map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Legend
                                        formatter={(v) => titleCase(String(v))}
                                        wrapperStyle={{ fontSize: 12, color: 'var(--muted-foreground)' }}
                                    />
                                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ---------- Quick actions + class strength ---------- */}
            <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <QuickActions />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Class-wise strength</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                        {loading ? (
                            <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.byClass || []} layout="vertical" margin={{ left: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                                    <XAxis
                                        type="number"
                                        allowDecimals={false}
                                        tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={70}
                                        tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip cursor={{ fill: 'var(--muted)' }} contentStyle={TOOLTIP_STYLE} />
                                    <Bar
                                        dataKey="studentCount"
                                        name="Students"
                                        fill="var(--chart-1)"
                                        radius={[0, 6, 6, 0]}
                                        maxBarSize={22}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ---------- Recent admissions + activity feed ---------- */}
            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader className="flex-row items-center justify-between">
                        <CardTitle>Recent admissions</CardTitle>
                        <Link
                            to="/students"
                            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                            View all <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </CardHeader>
                    <CardContent>
                        <TableWrap>
                            <Table>
                                <THead>
                                    <TR>
                                        <TH>Admission No</TH>
                                        <TH>Name</TH>
                                        <TH>Class</TH>
                                        <TH>Roll</TH>
                                        <TH>Admitted on</TH>
                                    </TR>
                                </THead>
                                <TBody>
                                    {(data?.recentAdmissions || []).length === 0 ? (
                                        <EmptyRow colSpan={5}>Abhi koi admission nahi hui</EmptyRow>
                                    ) : (
                                        data.recentAdmissions.map((s) => (
                                            <TR key={s.id}>
                                                <TD className="font-mono text-xs">{s.admissionNo}</TD>
                                                <TD className="font-medium">{fullName(s)}</TD>
                                                <TD>
                                                    <Badge variant="secondary">
                                                        {s.schoolClass?.name || '-'}
                                                        {s.section ? ' - ' + s.section.name : ''}
                                                    </Badge>
                                                </TD>
                                                <TD>{s.rollNo || '-'}</TD>
                                                <TD className="text-muted-foreground">
                                                    {formatDate(s.admissionDate)}
                                                </TD>
                                            </TR>
                                        ))
                                    )}
                                </TBody>
                            </Table>
                        </TableWrap>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent activity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        {(data?.recentActivities || []).length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                Abhi koi activity nahi
                            </p>
                        ) : (
                            data.recentActivities.map((a, i) => (
                                <div
                                    key={i}
                                    className="flex items-start gap-3 rounded-lg px-1 py-2.5 transition-colors hover:bg-muted/50"
                                >
                                    <span
                                        className={
                                            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ' +
                                            (ACTIVITY_TONE[a.type] || ACTIVITY_TONE.admission)
                                        }
                                    >
                                        {a.type === 'teacher' ? (
                                            <Users className="h-4 w-4" />
                                        ) : (
                                            <UserPlus className="h-4 w-4" />
                                        )}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-foreground">{a.title}</p>
                                        <p className="truncate text-xs text-muted-foreground">{a.detail}</p>
                                    </div>
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                        {timeAgo(a.at)}
                                    </span>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
