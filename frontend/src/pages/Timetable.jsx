import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Clock, CalendarRange, User, Trash2, Settings2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { PeriodsModal } from '@/components/timetable/PeriodsModal';
import { SlotModal } from '@/components/timetable/SlotModal';
import { cn } from '@/lib/utils';

const TABS = [
    { key: 'class', label: 'Class timetable', icon: CalendarRange },
    { key: 'teacher', label: 'Teacher schedule', icon: User },
];

export default function Timetable() {
    const { can } = useAuth();
    const canManage = can('timetable.manage');

    const [tab, setTab] = useState('class');
    const [classes, setClasses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [classId, setClassId] = useState('');
    const [sectionId, setSectionId] = useState('');
    const [teacherId, setTeacherId] = useState('');

    const [grid, setGrid] = useState(null);
    const [teacherGrid, setTeacherGrid] = useState(null);
    const [loading, setLoading] = useState(false);

    const [periodsOpen, setPeriodsOpen] = useState(false);
    const [editSlot, setEditSlot] = useState(null);

    useEffect(() => {
        api.get('/classes/options').then(({ data }) => {
            setClasses(data.data);
            const first = data.data[0];
            if (first) {
                setClassId(String(first.id));
                if (first.sections?.[0]) setSectionId(String(first.sections[0].id));
            }
        });
        api.get('/teachers/options')
            .then(({ data }) => setTeachers(data.data))
            .catch(() => {});
    }, []);

    const sections = classes.find((c) => String(c.id) === String(classId))?.sections || [];

    const loadGrid = useCallback(() => {
        if (!sectionId) return;
        setLoading(true);
        api.get('/timetable', { params: { sectionId } })
            .then(({ data }) => setGrid(data.data))
            .catch((err) => {
                toast.error(err.message);
                setGrid(null);
            })
            .finally(() => setLoading(false));
    }, [sectionId]);

    const loadTeacher = useCallback(() => {
        if (!teacherId) {
            setTeacherGrid(null);
            return;
        }
        setLoading(true);
        api.get('/timetable/teacher', { params: { teacherId } })
            .then(({ data }) => setTeacherGrid(data.data))
            .catch((err) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, [teacherId]);

    useEffect(() => {
        if (tab === 'class') loadGrid();
    }, [tab, loadGrid]);

    useEffect(() => {
        if (tab === 'teacher') loadTeacher();
    }, [tab, loadTeacher]);

    const removeSlot = async (slotId) => {
        try {
            await api.delete('/timetable/slots/' + slotId);
            toast.success('Slot hata diya gaya');
            loadGrid();
        } catch (err) {
            toast.error(err.message);
        }
    };

    return (
        <div>
            <PageHeader
                title="Timetable"
                subtitle="Period-wise weekly schedule - class ya teacher ke hisaab se"
                actions={
                    canManage ? (
                        <Button variant="outline" onClick={() => setPeriodsOpen(true)}>
                            <Settings2 /> Periods
                        </Button>
                    ) : null
                }
            />

            <div className="mb-4 flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={cn(
                            'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            tab === key
                                ? 'bg-card text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <Icon className="h-4 w-4" /> {label}
                    </button>
                ))}
            </div>

            <Card className="mb-4">
                <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                    {tab === 'class' ? (
                        <>
                            <Select
                                value={classId}
                                onChange={(e) => {
                                    setClassId(e.target.value);
                                    const cls = classes.find((c) => String(c.id) === e.target.value);
                                    setSectionId(cls?.sections?.[0] ? String(cls.sections[0].id) : '');
                                }}
                            >
                                <option value="">Select class</option>
                                {classes.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </Select>
                            <Select
                                value={sectionId}
                                onChange={(e) => setSectionId(e.target.value)}
                                disabled={!classId}
                            >
                                <option value="">Select section</option>
                                {sections.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        Section {s.name}
                                    </option>
                                ))}
                            </Select>
                            {grid ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    {grid.filled} periods bhare hue hain
                                </div>
                            ) : null}
                        </>
                    ) : (
                        <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                            <option value="">Select teacher</option>
                            {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.user?.name} ({t.employeeNo})
                                </option>
                            ))}
                        </Select>
                    )}
                </CardContent>
            </Card>

            {loading ? (
                <div className="h-96 animate-pulse rounded-xl bg-muted" />
            ) : tab === 'class' ? (
                !grid ? (
                    <Card>
                        <CardContent className="py-16 text-center text-sm text-muted-foreground">
                            Class aur section chuniye
                        </CardContent>
                    </Card>
                ) : grid.periods.length === 0 ? (
                    <Card>
                        <CardContent className="space-y-3 py-16 text-center">
                            <p className="text-sm text-muted-foreground">
                                Abhi koi period set nahi hai - pehle bell schedule banaiye
                            </p>
                            {canManage ? (
                                <Button onClick={() => setPeriodsOpen(true)}>
                                    <Settings2 /> Periods set kijiye
                                </Button>
                            ) : null}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
                        <table className="w-full min-w-[900px] border-collapse text-sm">
                            <thead>
                                <tr className="bg-muted/60">
                                    <th className="w-40 border-b border-border px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Period
                                    </th>
                                    {grid.days.map((d) => (
                                        <th
                                            key={d.value}
                                            className="border-b border-l border-border px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                                        >
                                            {d.short}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {grid.periods.map((p) => (
                                    <tr key={p.id} className={p.isBreak ? 'bg-muted/40' : undefined}>
                                        <td className="border-b border-border px-4 py-3 align-top">
                                            <p className="font-medium text-foreground">{p.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {p.startTime} - {p.endTime}
                                            </p>
                                        </td>
                                        {p.isBreak ? (
                                            <td
                                                colSpan={grid.days.length}
                                                className="border-b border-l border-border px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
                                            >
                                                {p.name}
                                            </td>
                                        ) : (
                                            grid.days.map((d) => (
                                                <td
                                                    key={d.value}
                                                    className="group border-b border-l border-border p-1.5 align-top"
                                                >
                                                    <TimetableCell
                                                        cell={p.cells[d.value]}
                                                        canManage={canManage}
                                                        onEdit={() =>
                                                            setEditSlot({
                                                                periodId: p.id,
                                                                periodName: p.name,
                                                                dayOfWeek: d.value,
                                                                dayLabel: d.label,
                                                                existing: p.cells[d.value],
                                                            })
                                                        }
                                                        onRemove={removeSlot}
                                                    />
                                                </td>
                                            ))
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            ) : null}

            {loading || tab !== 'teacher' ? null : !teacherGrid ? (
                <Card>
                    <CardContent className="py-16 text-center text-sm text-muted-foreground">
                        Teacher chuniye
                    </CardContent>
                </Card>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
                    <table className="w-full min-w-[900px] border-collapse text-sm">
                        <thead>
                            <tr className="bg-muted/60">
                                <th className="w-40 border-b border-border px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Period
                                </th>
                                {teacherGrid.days.map((d) => (
                                    <th
                                        key={d.value}
                                        className="border-b border-l border-border px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                                    >
                                        {d.short}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {teacherGrid.periods.map((p) => (
                                <tr key={p.id}>
                                    <td className="border-b border-border px-4 py-3 align-top">
                                        <p className="font-medium text-foreground">{p.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {p.startTime} - {p.endTime}
                                        </p>
                                    </td>
                                    {teacherGrid.days.map((d) => {
                                        const c = p.cells[d.value];
                                        return (
                                            <td
                                                key={d.value}
                                                className="border-b border-l border-border p-1.5 align-top"
                                            >
                                                {c ? (
                                                    <div className="rounded-lg border border-border bg-accent/40 p-2">
                                                        <p className="truncate text-xs font-medium text-foreground">
                                                            {c.className}
                                                            {c.sectionName ? ' - ' + c.sectionName : ''}
                                                        </p>
                                                        <p className="truncate text-[11px] text-muted-foreground">
                                                            {c.subject}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="flex min-h-14 items-center justify-center text-xs text-muted-foreground">
                                                        Free
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
                        Hafte me kul {teacherGrid.totalPeriods} periods
                    </div>
                </div>
            )}

            <PeriodsModal open={periodsOpen} onOpenChange={setPeriodsOpen} onChanged={loadGrid} />

            <SlotModal
                slot={editSlot}
                classId={classId}
                sectionId={sectionId}
                teachers={teachers}
                onClose={() => setEditSlot(null)}
                onSaved={loadGrid}
            />
        </div>
    );
}

/** Grid ka ek cell - subject card ya "+ Add" placeholder. */
function TimetableCell({ cell, canManage, onEdit, onRemove }) {
    if (!cell) {
        if (!canManage) {
            return (
                <div className="flex min-h-14 items-center justify-center text-xs text-muted-foreground">
                    -
                </div>
            );
        }
        return (
            <button
                onClick={onEdit}
                className="flex h-full min-h-14 w-full items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
                + Add
            </button>
        );
    }

    return (
        <div
            onClick={() => canManage && onEdit()}
            className={cn(
                'relative min-h-14 rounded-lg border border-border bg-accent/40 p-2 transition-colors',
                canManage && 'cursor-pointer hover:border-primary/50'
            )}
        >
            <p className="truncate text-xs font-medium text-foreground">{cell.subject}</p>
            <p className="truncate text-[11px] text-muted-foreground">
                {cell.teacherName || 'No teacher'}
            </p>
            {canManage ? (
                <button
                    title="Hataiye"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(cell.id);
                    }}
                    className="absolute right-1 top-1 hidden rounded p-0.5 text-destructive hover:bg-destructive/10 group-hover:block"
                >
                    <Trash2 className="h-3 w-3" />
                </button>
            ) : null}
        </div>
    );
}
