import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Radio, CalendarDays, Settings2, UserCheck, Clock, UserX, Plane, ShieldAlert, Download, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/dashboard/StatCard';
import { LiveBoard } from '@/components/hr/LiveBoard';
import { RegisterGrid, Legend, registerCsv } from '@/components/hr/RegisterGrid';
import { HrSettingsForm } from '@/components/hr/HrSettingsForm';
import { ManualMarkModal } from '@/components/hr/ManualMarkModal';
import { cn } from '@/lib/utils';

const TABS = [
    { key: 'live', label: 'Live', icon: Radio },
    { key: 'register', label: 'Monthly register', icon: CalendarDays },
    { key: 'settings', label: 'HR settings', icon: Settings2 },
];

export default function StaffAttendance() {
    const { can } = useAuth();
    const canManage = can('hr.manage');
    const [tab, setTab] = useState('live');
    const [date, setDate] = useState('');
    const [live, setLive] = useState(null);
    const [month, setMonth] = useState('');
    const [reg, setReg] = useState(null);
    const [marking, setMarking] = useState(null);
    const [updatedAt, setUpdatedAt] = useState(null);

    const loadLive = useCallback(
        (quiet) =>
            api
                .get('/hr/live', { params: date ? { date } : {} })
                .then(({ data }) => {
                    setLive(data.data);
                    setUpdatedAt(new Date());
                    if (!date) setDate(data.data.date);
                })
                .catch((err) => !quiet && toast.error(err.message)),
        [date]
    );

    const loadReg = useCallback(
        () =>
            api
                .get('/hr/register', { params: month ? { month } : {} })
                .then(({ data }) => {
                    setReg(data.data);
                    if (!month) setMonth(data.data.month);
                })
                .catch((err) => toast.error(err.message)),
        [month]
    );

    useEffect(() => {
        if (tab === 'live') loadLive();
        if (tab === 'register') loadReg();
    }, [tab, loadLive, loadReg]);

    // Aaj ka panel "live" - har 30 sec naya data (tab chhupa ho to nahi)
    const isToday = live && live.date === live.today;
    useEffect(() => {
        if (tab !== 'live' || !isToday) return undefined;
        const t = setInterval(() => document.visibilityState === 'visible' && loadLive(true), 30000);
        return () => clearInterval(t);
    }, [tab, isToday, loadLive]);

    const refresh = () => (tab === 'live' ? loadLive() : loadReg());

    const downloadCsv = () => {
        const blob = new Blob(['﻿' + registerCsv(reg)], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'staff-attendance-' + reg.month + '.csv';
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const c = live?.counts;
    return (
        <div>
            <PageHeader
                title="Staff attendance"
                subtitle={
                    live
                        ? 'Timing ' + live.policy.officeStart + ' - ' + live.policy.officeEnd + (live.policy.school ? ' | campus radius ' + live.policy.radiusM + ' m' : ' | school location set nahi')
                        : 'Selfie + location ke saath app se check-in'
                }
                actions={
                    tab !== 'settings' ? (
                        <Button variant="outline" onClick={refresh}>
                            <RefreshCw /> Refresh
                        </Button>
                    ) : null
                }
            />

            <div className="mb-5 flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/50 p-1">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={cn(
                            'flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            tab === key ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <Icon className="h-4 w-4" /> {label}
                        {key === 'live' && isToday ? <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> : null}
                    </button>
                ))}
            </div>

            {tab === 'live' ? (
                !live ? (
                    <p className="py-16 text-center text-sm text-muted-foreground">Loading...</p>
                ) : (
                    <>
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                            <Input type="date" className="w-44" value={date} max={live.today} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
                            {isToday ? (
                                <span className="text-xs text-muted-foreground">
                                    Live - har 30 sec update{updatedAt ? ' (last ' + updatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ')' : ''}
                                </span>
                            ) : (
                                <button onClick={() => setDate(live.today)} className="text-xs font-medium text-primary hover:underline">
                                    Aaj par wapas
                                </button>
                            )}
                            {live.isOffDay ? <span className="text-xs font-medium text-amber-600">Ye weekly off ka din hai</span> : null}
                        </div>
                        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <StatCard icon={UserCheck} tone="brand" label="Aa gaye" value={c.present + c.late + c['half-day'] + ' / ' + c.total} hint={c.checkedOut + ' ja chuke'} />
                            <StatCard icon={Clock} tone="amber" label="Late" value={c.late} hint={'Grace ' + live.policy.graceMinutes + ' min ke baad'} />
                            <StatCard icon={UserX} tone="violet" label={isToday ? 'Abhi nahi aaye' : 'Absent'} value={c.notYet + c.absent} hint={c.leave + ' leave par'} />
                            <StatCard icon={ShieldAlert} tone="blue" label="Flags" value={c.outside + c.mocked} hint={c.outside + ' campus ke bahar, ' + c.mocked + ' mock'} />
                        </div>
                        <LiveBoard data={live} canManage={canManage} onMark={(row) => setMarking({ user: row.user, date: live.date, status: row.record?.status })} />
                    </>
                )
            ) : null}

            {tab === 'register' ? (
                <>
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                        <Input type="month" className="w-44" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month" />
                        {reg ? (
                            <Button variant="outline" size="sm" onClick={downloadCsv}>
                                <Download /> Excel (CSV)
                            </Button>
                        ) : null}
                        <div className="ml-auto">
                            <Legend />
                        </div>
                    </div>
                    {reg ? (
                        <RegisterGrid data={reg} canManage={canManage} today={live?.today || new Date().toISOString().slice(0, 10)} onCell={(row, d, s) => setMarking({ user: row.user, date: d, status: s })} />
                    ) : (
                        <p className="py-16 text-center text-sm text-muted-foreground">Loading...</p>
                    )}
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Plane className="h-3.5 w-3.5" /> Approved leave apne aap LV dikhti hai. {canManage ? 'Kisi khane par click karke status badal sakte hain.' : ''}
                    </p>
                </>
            ) : null}

            {tab === 'settings' ? <HrSettingsForm canManage={canManage} onSaved={() => setLive(null)} /> : null}

            <ManualMarkModal target={marking} onClose={() => setMarking(null)} onSaved={refresh} />
        </div>
    );
}
