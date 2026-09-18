import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/field';
import { Picker } from '@/components/ui/picker';
import { formatCurrency, fullName } from '@/lib/utils';

/**
 * target: null = band, { routeId? } = naya assignment, { rider } = route/stop badalna.
 * Student pehle se kisi route par ho to server use naye route par shift kar deta hai.
 */
export function AssignModal({ target, routes, onClose, onSaved }) {
    const rider = target?.rider;
    const [student, setStudent] = useState(null);
    const [routeId, setRouteId] = useState('');
    const [stopId, setStopId] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!target) return;
        setStudent(rider ? { id: rider.studentId, ...rider.student } : null);
        setRouteId(String(rider?.routeId || target.routeId || ''));
        setStopId(String(rider?.stopId || ''));
    }, [target, rider]);

    const usable = routes.filter((r) => r.status === 'active' && r.vehicle);
    const route = usable.find((r) => String(r.id) === routeId);
    const sameRoute = rider && String(rider.routeId) === routeId;
    const full = route && !sameRoute && route.seatsLeft <= 0;

    const submit = async (e) => {
        e?.preventDefault();
        if (!student) return toast.error('Student chuniye');
        setSaving(true);
        try {
            const { data } = await api.post('/transport/riders', {
                studentId: student.id,
                routeId: Number(routeId),
                stopId: Number(stopId),
            });
            toast.success(data.message);
            onClose();
            onSaved?.();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={Boolean(target)}
            onOpenChange={(v) => !v && onClose()}
            title={rider ? 'Change route / stop' : 'Assign transport'}
            description={rider ? fullName(rider.student) + ' - ' + rider.student.admissionNo : 'Student, route aur stop chuniye'}
            size="md"
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={saving || !student || !routeId || !stopId || full}>
                        {saving ? 'Saving...' : 'Save'}
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} className="space-y-4">
                {!rider ? (
                    <Picker
                        label="Student"
                        placeholder="Naam ya admission no"
                        value={student}
                        onPick={setStudent}
                        fetcher={(q) =>
                            api
                                .get('/students', { params: { limit: 20, search: q || undefined, status: 'active' } })
                                .then(({ data }) => data.data.items)
                        }
                        render={(s) => ({
                            title: fullName(s),
                            sub:
                                s.admissionNo +
                                (s.schoolClass ? ' - ' + s.schoolClass.name : '') +
                                (s.section ? ' ' + s.section.name : ''),
                        })}
                    />
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                        label="Route"
                        name="routeId"
                        value={routeId}
                        onChange={(e) => {
                            setRouteId(e.target.value);
                            setStopId('');
                        }}
                    >
                        <option value="">Route chuniye</option>
                        {usable.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.code} - {r.name} ({r.seatsLeft} seats khali)
                            </option>
                        ))}
                    </SelectField>
                    <SelectField
                        label="Stop"
                        name="stopId"
                        value={stopId}
                        onChange={(e) => setStopId(e.target.value)}
                        disabled={!route}
                    >
                        <option value="">Stop chuniye</option>
                        {route?.stops.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                                {s.pickupTime ? ' - ' + s.pickupTime : ''}
                            </option>
                        ))}
                    </SelectField>
                </div>

                {route ? (
                    <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
                        <p className="text-foreground">
                            {route.vehicle.regNo} - {route.vehicle.driverName || 'Driver pending'}
                        </p>
                        <p className="text-muted-foreground">
                            {route.riders}/{route.vehicle.capacity} seats bhari - fare {formatCurrency(route.monthlyFare)}/mahina
                        </p>
                        {full ? <p className="mt-1 font-medium text-destructive">Ye route full hai</p> : null}
                    </div>
                ) : null}
                <button type="submit" className="hidden" />
            </form>
        </Modal>
    );
}
