import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    Plus, Search, Pencil, Trash2, Bus, Route as RouteIcon, Users, IndianRupee, MapPin, Phone, UserPlus, AlertTriangle, X,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useNewParam } from '@/hooks/useNewParam';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow, LoadingRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { StatCard } from '@/components/dashboard/StatCard';
import { VehicleModal } from '@/components/transport/VehicleModal';
import { RouteModal } from '@/components/transport/RouteModal';
import { StopModal } from '@/components/transport/StopModal';
import { AssignModal } from '@/components/transport/AssignModal';
import { formatCurrency, formatDate, fullName, cn } from '@/lib/utils';

const VEHICLE_TONE = { active: 'success', maintenance: 'warning', inactive: 'muted' };
const TYPE_LABEL = { bus: 'Bus', 'mini-bus': 'Mini bus', van: 'Van', auto: 'Auto' };

export default function Transport() {
    const { can } = useAuth();
    const canManage = can('transport.manage');

    const [tab, setTab] = useState('routes');
    const [summary, setSummary] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loadingBase, setLoadingBase] = useState(true);

    const [vehicleForm, setVehicleForm] = useState(null);
    const [routeForm, setRouteForm] = useState(null);
    const [stopTarget, setStopTarget] = useState(null);
    const [assignTarget, setAssignTarget] = useState(null);
    const [deleting, setDeleting] = useState(null); // { kind, item, label }
    const [ridersKey, setRidersKey] = useState(0);

    const loadBase = useCallback(() => {
        setLoadingBase(true);
        Promise.all([api.get('/transport/summary'), api.get('/transport/routes'), api.get('/transport/vehicles')])
            .then(([s, r, v]) => {
                setSummary(s.data.data);
                setRoutes(r.data.data);
                setVehicles(v.data.data);
            })
            .catch((err) => toast.error(err.message))
            .finally(() => setLoadingBase(false));
    }, []);

    useEffect(() => {
        loadBase();
    }, [loadBase]);

    useNewParam(() => {
        if (canManage) setAssignTarget({});
    });

    const refreshAll = () => {
        loadBase();
        setRidersKey((k) => k + 1);
    };

    const confirmDelete = async () => {
        const { kind, item } = deleting;
        const path = { vehicle: '/transport/vehicles/', route: '/transport/routes/', stop: '/transport/stops/', rider: '/transport/riders/' }[kind];
        try {
            const { data } = await api.delete(path + (kind === 'rider' ? item.studentId : item.id));
            toast.success(data.message);
            setDeleting(null);
            refreshAll();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const TABS = [
        { key: 'routes', label: 'Routes', icon: RouteIcon },
        { key: 'vehicles', label: 'Vehicles', icon: Bus },
        { key: 'riders', label: 'Students', icon: Users },
    ];

    const headerAction = !canManage ? null : tab === 'routes' ? (
        <Button onClick={() => setRouteForm({})}>
            <Plus /> New route
        </Button>
    ) : tab === 'vehicles' ? (
        <Button onClick={() => setVehicleForm({})}>
            <Plus /> Add vehicle
        </Button>
    ) : (
        <Button onClick={() => setAssignTarget({})}>
            <UserPlus /> Assign student
        </Button>
    );

    return (
        <div>
            <PageHeader
                title="Transport"
                subtitle="School bus routes, vehicles aur kaun kis stop se aata hai"
                actions={headerAction}
            />

            <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    icon={RouteIcon}
                    tone="brand"
                    label="Active routes"
                    value={summary ? summary.activeRoutes : '-'}
                    hint={summary ? summary.routes + ' routes kul' : undefined}
                />
                <StatCard
                    icon={Bus}
                    tone="blue"
                    label="Vehicles"
                    value={summary ? summary.vehicles : '-'}
                    hint={
                        summary
                            ? summary.inMaintenance + ' maintenance me' +
                              (summary.insuranceExpired ? ', ' + summary.insuranceExpired + ' insurance expired' : '')
                            : undefined
                    }
                />
                <StatCard
                    icon={Users}
                    tone="amber"
                    label="Students on bus"
                    value={summary ? summary.riders : '-'}
                    hint={summary ? summary.seatsLeft + ' / ' + summary.seats + ' seats khali' : undefined}
                />
                <StatCard
                    icon={IndianRupee}
                    tone="violet"
                    label="Monthly fare"
                    value={summary ? formatCurrency(summary.monthlyFare) : '-'}
                    hint="Saare riders ka hisaab"
                />
            </div>

            <div className="mb-4 flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={cn(
                            'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            tab === key ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <Icon className="h-4 w-4" /> {label}
                    </button>
                ))}
            </div>

            {tab === 'routes' ? (
                <RoutesGrid
                    routes={routes}
                    loading={loadingBase}
                    canManage={canManage}
                    onEdit={setRouteForm}
                    onDelete={(r) => setDeleting({ kind: 'route', item: r, label: r.code + ' - ' + r.name })}
                    onAddStop={(r) => setStopTarget({ route: r })}
                    onEditStop={(r, s) => setStopTarget({ route: r, stop: s })}
                    onDeleteStop={(s) => setDeleting({ kind: 'stop', item: s, label: s.name })}
                    onAssign={(r) => setAssignTarget({ routeId: r.id })}
                />
            ) : tab === 'vehicles' ? (
                <VehiclesTable
                    vehicles={vehicles}
                    loading={loadingBase}
                    canManage={canManage}
                    onEdit={setVehicleForm}
                    onDelete={(v) => setDeleting({ kind: 'vehicle', item: v, label: v.regNo })}
                />
            ) : (
                <RidersTab
                    key={ridersKey}
                    routes={routes}
                    canManage={canManage}
                    onChange={(r) => setAssignTarget({ rider: r })}
                    onRemove={(r) => setDeleting({ kind: 'rider', item: r, label: fullName(r.student) + ' ka transport' })}
                />
            )}

            <VehicleModal vehicle={vehicleForm} onClose={() => setVehicleForm(null)} onSaved={refreshAll} />
            <RouteModal route={routeForm} vehicles={vehicles} onClose={() => setRouteForm(null)} onSaved={refreshAll} />
            <StopModal target={stopTarget} onClose={() => setStopTarget(null)} onSaved={refreshAll} />
            <AssignModal target={assignTarget} routes={routes} onClose={() => setAssignTarget(null)} onSaved={refreshAll} />

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={(deleting?.kind === 'rider' ? 'Hatana hai ' : 'Delete ') + '"' + (deleting?.label || '') + '"?'}
                message={
                    deleting?.kind === 'rider'
                        ? 'Student is route se hat jayega, seat khali ho jayegi.'
                        : 'Jis par students lage hain wo delete nahi hoga.'
                }
                onConfirm={confirmDelete}
            />
        </div>
    );
}

/** Har route ek card - bus, bhari seats aur stops ki timeline. */
function RoutesGrid({ routes, loading, canManage, onEdit, onDelete, onAddStop, onEditStop, onDeleteStop, onAssign }) {
    if (loading && !routes.length) {
        return <p className="py-12 text-center text-sm text-muted-foreground">Loading...</p>;
    }
    if (!routes.length) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    Abhi koi route nahi bana
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            {routes.map((r) => {
                const cap = r.vehicle?.capacity || 0;
                const pct = cap ? Math.min(100, Math.round((r.riders / cap) * 100)) : 0;
                return (
                    <Card key={r.id} className={cn(r.status !== 'active' && 'opacity-70')}>
                        <CardContent className="p-5">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground shadow-brand">
                                    {r.code}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-foreground">{r.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {formatCurrency(r.monthlyFare)}/mahina
                                        {r.status !== 'active' ? ' - inactive' : ''}
                                    </p>
                                </div>
                                {canManage ? (
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon-sm" title="Edit" onClick={() => onEdit(r)}>
                                            <Pencil />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            title="Delete"
                                            className="text-destructive hover:bg-destructive/10"
                                            onClick={() => onDelete(r)}
                                        >
                                            <Trash2 />
                                        </Button>
                                    </div>
                                ) : null}
                            </div>

                            <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3">
                                {r.vehicle ? (
                                    <>
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                            <span className="flex items-center gap-2 font-medium text-foreground">
                                                <Bus className="h-4 w-4 text-primary" /> {r.vehicle.regNo}
                                                {r.vehicle.status !== 'active' ? (
                                                    <Badge variant={VEHICLE_TONE[r.vehicle.status]}>{r.vehicle.status}</Badge>
                                                ) : null}
                                            </span>
                                            {r.vehicle.driverName ? (
                                                <span className="flex items-center gap-1 text-muted-foreground">
                                                    <Phone className="h-3.5 w-3.5" /> {r.vehicle.driverName}
                                                    {r.vehicle.driverPhone ? ' - ' + r.vehicle.driverPhone : ''}
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="mt-3 flex items-center gap-3">
                                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                                                <div
                                                    className={cn(
                                                        'h-full rounded-full',
                                                        pct >= 100 ? 'bg-destructive' : pct >= 85 ? 'bg-amber-500' : 'bg-primary'
                                                    )}
                                                    style={{ width: pct + '%' }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium text-muted-foreground">
                                                {r.riders}/{cap} seats
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <p className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                                        <AlertTriangle className="h-4 w-4" /> Koi vehicle nahi laga - students assign nahi honge
                                    </p>
                                )}
                            </div>

                            <ol className="mt-4 space-y-0">
                                {r.stops.map((s, i) => (
                                    <li key={s.id} className="group relative flex gap-3 pb-3 last:pb-0">
                                        {i < r.stops.length - 1 ? (
                                            <span className="absolute left-[7px] top-4 h-full w-px bg-border" />
                                        ) : null}
                                        <span className="relative mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-primary bg-card" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm text-foreground">{s.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Pickup {s.pickupTime || '--'} - Drop {s.dropTime || '--'}
                                            </p>
                                        </div>
                                        {canManage ? (
                                            <div className="flex gap-0.5 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                                                <Button variant="ghost" size="icon-sm" title="Edit stop" onClick={() => onEditStop(r, s)}>
                                                    <Pencil />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="Remove stop"
                                                    className="text-destructive hover:bg-destructive/10"
                                                    onClick={() => onDeleteStop(s)}
                                                >
                                                    <X />
                                                </Button>
                                            </div>
                                        ) : null}
                                    </li>
                                ))}
                                {!r.stops.length ? (
                                    <li className="text-sm text-muted-foreground">Abhi koi stop nahi</li>
                                ) : null}
                            </ol>

                            {canManage ? (
                                <div className="mt-4 flex gap-2 border-t border-border pt-4">
                                    <Button variant="outline" size="sm" onClick={() => onAddStop(r)}>
                                        <MapPin /> Add stop
                                    </Button>
                                    <Button
                                        size="sm"
                                        disabled={r.status !== 'active' || !r.vehicle || !r.stops.length || r.seatsLeft <= 0}
                                        onClick={() => onAssign(r)}
                                    >
                                        <UserPlus /> Assign student
                                    </Button>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

function VehiclesTable({ vehicles, loading, canManage, onEdit, onDelete }) {
    const cols = canManage ? 7 : 6;
    return (
        <TableWrap>
            <Table>
                <THead>
                    <TR>
                        <TH>Vehicle</TH>
                        <TH>Seats</TH>
                        <TH>Driver</TH>
                        <TH>Helper</TH>
                        <TH>Route</TH>
                        <TH>Insurance</TH>
                        {canManage ? <TH className="text-right">Actions</TH> : null}
                    </TR>
                </THead>
                <TBody>
                    {loading && !vehicles.length ? (
                        <LoadingRow colSpan={cols} />
                    ) : vehicles.length === 0 ? (
                        <EmptyRow colSpan={cols}>Koi vehicle nahi</EmptyRow>
                    ) : (
                        vehicles.map((v) => (
                            <TR key={v.id}>
                                <TD>
                                    <p className="font-mono text-sm font-medium text-foreground">{v.regNo}</p>
                                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        {TYPE_LABEL[v.type]}
                                        <Badge variant={VEHICLE_TONE[v.status]} className="capitalize">
                                            {v.status}
                                        </Badge>
                                    </p>
                                </TD>
                                <TD>{v.capacity}</TD>
                                <TD>
                                    <p className="text-sm text-foreground">{v.driverName || '-'}</p>
                                    <p className="text-xs text-muted-foreground">{v.driverPhone}</p>
                                </TD>
                                <TD>
                                    <p className="text-sm text-foreground">{v.helperName || '-'}</p>
                                    <p className="text-xs text-muted-foreground">{v.helperPhone}</p>
                                </TD>
                                <TD>
                                    {v.route ? (
                                        <Badge variant="secondary">
                                            {v.route.code} - {v.route.name}
                                        </Badge>
                                    ) : (
                                        <span className="text-muted-foreground">Spare</span>
                                    )}
                                </TD>
                                <TD className={v.insuranceExpired ? 'font-medium text-destructive' : 'text-muted-foreground'}>
                                    {v.insuranceExpiry ? formatDate(v.insuranceExpiry) : '-'}
                                    {v.insuranceExpired ? <span className="block text-xs">Expired</span> : null}
                                </TD>
                                {canManage ? (
                                    <TD>
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon-sm" title="Edit" onClick={() => onEdit(v)}>
                                                <Pencil />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                title="Delete"
                                                className="text-destructive hover:bg-destructive/10"
                                                onClick={() => onDelete(v)}
                                            >
                                                <Trash2 />
                                            </Button>
                                        </div>
                                    </TD>
                                ) : null}
                            </TR>
                        ))
                    )}
                </TBody>
            </Table>
        </TableWrap>
    );
}

/** Students tab - apni list + filter, isliye alag load karta hai. */
function RidersTab({ routes, canManage, onChange, onRemove }) {
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [routeId, setRouteId] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const search = useDebounce(searchInput, 400);

    useEffect(() => {
        setLoading(true);
        const params = { page, limit: 15 };
        if (routeId) params.routeId = routeId;
        if (search) params.search = search;
        api.get('/transport/riders', { params })
            .then(({ data }) => {
                setItems(data.data.items);
                setMeta(data.data.meta);
            })
            .catch((err) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, [page, routeId, search]);

    const cols = canManage ? 6 : 5;
    return (
        <>
            <Card className="mb-4">
                <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
                    <div className="relative sm:col-span-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Student, admission no ya stop"
                            className="pl-9"
                            value={searchInput}
                            onChange={(e) => {
                                setPage(1);
                                setSearchInput(e.target.value);
                            }}
                        />
                    </div>
                    <Select
                        value={routeId}
                        onChange={(e) => {
                            setPage(1);
                            setRouteId(e.target.value);
                        }}
                    >
                        <option value="">All routes</option>
                        {routes.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.code} - {r.name}
                            </option>
                        ))}
                    </Select>
                </CardContent>
            </Card>

            <TableWrap>
                <Table>
                    <THead>
                        <TR>
                            <TH>Student</TH>
                            <TH>Class</TH>
                            <TH>Route</TH>
                            <TH>Stop</TH>
                            <TH>Timing</TH>
                            {canManage ? <TH className="text-right">Actions</TH> : null}
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <LoadingRow colSpan={cols} />
                        ) : items.length === 0 ? (
                            <EmptyRow colSpan={cols}>Koi student nahi mila</EmptyRow>
                        ) : (
                            items.map((r) => (
                                <TR key={r.id}>
                                    <TD>
                                        <p className="font-medium text-foreground">{fullName(r.student)}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {r.student.admissionNo}
                                            {r.student.guardianPhone ? ' - ' + r.student.guardianPhone : ''}
                                        </p>
                                    </TD>
                                    <TD className="text-muted-foreground">
                                        {r.student.schoolClass?.name || '-'}
                                        {r.student.section ? ' ' + r.student.section.name : ''}
                                    </TD>
                                    <TD>
                                        <Badge variant="secondary">{r.route.code}</Badge>
                                        <span className="ml-2 text-sm text-muted-foreground">{r.route.name}</span>
                                    </TD>
                                    <TD className="text-foreground">{r.stop.name}</TD>
                                    <TD className="text-xs text-muted-foreground">
                                        {r.stop.pickupTime || '--'} / {r.stop.dropTime || '--'}
                                    </TD>
                                    {canManage ? (
                                        <TD>
                                            <div className="flex justify-end gap-1">
                                                <Button variant="outline" size="sm" onClick={() => onChange(r)}>
                                                    Change
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="Remove"
                                                    className="text-destructive hover:bg-destructive/10"
                                                    onClick={() => onRemove(r)}
                                                >
                                                    <Trash2 />
                                                </Button>
                                            </div>
                                        </TD>
                                    ) : null}
                                </TR>
                            ))
                        )}
                    </TBody>
                </Table>
            </TableWrap>
            <Pagination meta={meta} onPage={setPage} />
        </>
    );
}
