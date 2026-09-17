import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Building2, GraduationCap, Users, IndianRupee, CheckCircle2, Clock, Ban } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

const CARDS = [
    { key: 'schools', label: 'Total schools', icon: Building2 },
    { key: 'activeSchools', label: 'Active', icon: CheckCircle2 },
    { key: 'trialSchools', label: 'On trial', icon: Clock },
    { key: 'suspended', label: 'Suspended', icon: Ban },
    { key: 'students', label: 'Students', icon: GraduationCap },
    { key: 'teachers', label: 'Teachers', icon: Users },
];

const PIE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];
const TOOLTIP_STYLE = {
    background: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: '0.5rem',
    color: 'var(--popover-foreground)',
    fontSize: 12,
};

export const SCHOOL_STATUS_VARIANT = { active: 'success', trial: 'warning', suspended: 'danger' };

export default function PlatformDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/platform/stats')
            .then(({ data: res }) => setData(res.data))
            .finally(() => setLoading(false));
    }, []);

    const counts = data?.counts || {};

    return (
        <div className="space-y-6">
            <PageHeader title="Platform console" subtitle="Saare schools ka overview" />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {CARDS.map(({ key, label, icon: Icon }) => (
                    <Card key={key}>
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
                ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>School-wise strength</CardTitle>
                    </CardHeader>
                    <CardContent className="h-72">
                        {loading ? (
                            <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.recentSchools || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                    <XAxis
                                        dataKey="code"
                                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip cursor={{ fill: 'var(--muted)' }} contentStyle={TOOLTIP_STYLE} />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                    <Bar dataKey="studentCount" name="Students" fill="var(--chart-1)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                                    <Bar dataKey="teacherCount" name="Teachers" fill="var(--chart-2)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Active revenue</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4">
                            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <IndianRupee className="h-5 w-5" />
                            </span>
                            <div>
                                <p className="text-xs text-muted-foreground">Active subscriptions</p>
                                <p className="text-xl font-semibold text-foreground">
                                    {loading ? '-' : formatCurrency(data?.activeRevenue)}
                                </p>
                            </div>
                        </div>

                        <div className="h-44">
                            {loading ? (
                                <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data?.planSplit || []}
                                            dataKey="count"
                                            nameKey="plan"
                                            innerRadius={40}
                                            outerRadius={64}
                                            paddingAngle={3}
                                        >
                                            {(data?.planSplit || []).map((_, i) => (
                                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Legend wrapperStyle={{ fontSize: 11, color: 'var(--muted-foreground)' }} />
                                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent schools</CardTitle>
                </CardHeader>
                <CardContent>
                    <TableWrap>
                        <Table>
                            <THead>
                                <TR>
                                    <TH>School</TH>
                                    <TH>Code</TH>
                                    <TH>Students</TH>
                                    <TH>Teachers</TH>
                                    <TH>Status</TH>
                                </TR>
                            </THead>
                            <TBody>
                                {(data?.recentSchools || []).length === 0 ? (
                                    <EmptyRow colSpan={5}>Abhi koi school nahi</EmptyRow>
                                ) : (
                                    data.recentSchools.map((s) => (
                                        <TR key={s.id}>
                                            <TD className="font-medium">
                                                <Link to="/platform/schools" className="hover:text-primary">
                                                    {s.name}
                                                </Link>
                                            </TD>
                                            <TD className="font-mono text-xs">{s.code}</TD>
                                            <TD>{s.studentCount}</TD>
                                            <TD>{s.teacherCount}</TD>
                                            <TD>
                                                <Badge
                                                    variant={SCHOOL_STATUS_VARIANT[s.status] || 'outline'}
                                                    className="capitalize"
                                                >
                                                    {s.status}
                                                </Badge>
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
