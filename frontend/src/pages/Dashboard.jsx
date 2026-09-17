import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';
import { GraduationCap, Users, School, Layers3, BookOpen, UserCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDate, fullName, titleCase } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const STAT_CARDS = [
    { key: 'students', label: 'Students', icon: GraduationCap, to: '/students' },
    { key: 'teachers', label: 'Teachers', icon: Users, to: '/teachers' },
    { key: 'classes', label: 'Classes', icon: School, to: '/classes' },
    { key: 'sections', label: 'Sections', icon: Layers3, to: '/sections' },
    { key: 'subjects', label: 'Subjects', icon: BookOpen, to: '/subjects' },
    { key: 'users', label: 'User accounts', icon: UserCircle2, to: '/students' },
];

// Chart colors index.css ke chart tokens se aate hain - dono theme me kaam karte hain
const PIE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-5)'];

const TOOLTIP_STYLE = {
    background: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: '0.5rem',
    color: 'var(--popover-foreground)',
    fontSize: 12,
};

export default function Dashboard() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/dashboard/stats')
            .then(({ data: res }) => setData(res.data))
            .finally(() => setLoading(false));
    }, []);

    const counts = data?.counts || {};

    return (
        <div className="space-y-6">
            <PageHeader
                title={'Namaste, ' + (user?.name?.split(' ')[0] || 'User')}
                subtitle="School ka aaj ka overview"
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {STAT_CARDS.map(({ key, label, icon: Icon, to }) => (
                    <Link key={key} to={to}>
                        <Card className="transition-shadow hover:shadow-md">
                            <CardContent className="flex items-center gap-3 p-5">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                                    <Icon className="h-5 w-5" />
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-xs text-muted-foreground">{label}</p>
                                    <p className="text-2xl font-semibold text-foreground">
                                        {loading ? '-' : (counts[key] ?? 0)}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Class-wise student strength</CardTitle>
                    </CardHeader>
                    <CardContent className="h-72">
                        {loading ? (
                            <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.byClass || []}>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="var(--border)"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="name"
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
                                    <Tooltip cursor={{ fill: 'var(--muted)' }} contentStyle={TOOLTIP_STYLE} />
                                    <Bar
                                        dataKey="studentCount"
                                        name="Students"
                                        fill="var(--chart-1)"
                                        radius={[6, 6, 0, 0]}
                                        maxBarSize={56}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Gender split</CardTitle>
                    </CardHeader>
                    <CardContent className="h-72">
                        {loading ? (
                            <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data?.genderSplit || []}
                                        dataKey="count"
                                        nameKey="gender"
                                        innerRadius={55}
                                        outerRadius={85}
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

            <Card>
                <CardHeader>
                    <CardTitle>Recent admissions</CardTitle>
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
        </div>
    );
}
