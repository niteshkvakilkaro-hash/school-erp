import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { LocateFixed, Save } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { cn } from '@/lib/utils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function Check({ checked, onChange, label, hint }) {
    return (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
            <span>
                <span className="block text-sm font-medium text-foreground">{label}</span>
                {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
            </span>
        </label>
    );
}

export function HrSettingsForm({ canManage, onSaved }) {
    const [f, setF] = useState(null);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [locating, setLocating] = useState(false);

    useEffect(() => {
        api.get('/hr/settings')
            .then(({ data }) => setF({ ...data.data, latitude: data.data.latitude ?? '', longitude: data.data.longitude ?? '' }))
            .catch((err) => toast.error(err.message));
    }, []);

    if (!f) return <p className="py-10 text-center text-sm text-muted-foreground">Loading...</p>;
    const set = (k) => (e) => setF((s) => ({ ...s, [k]: e?.target ? e.target.value : e }));

    const useMine = () => {
        if (!navigator.geolocation) return toast.error('Browser location nahi deta');
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (p) => {
                setF((s) => ({ ...s, latitude: p.coords.latitude.toFixed(7), longitude: p.coords.longitude.toFixed(7) }));
                toast.success('Location mil gayi (±' + Math.round(p.coords.accuracy) + ' m) - Save dabaiye');
                setLocating(false);
            },
            (err) => {
                toast.error('Location nahi mili: ' + err.message);
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 15000 }
        );
    };

    const save = async () => {
        setSaving(true);
        setErrors({});
        try {
            const hasPoint = f.latitude !== '' && f.longitude !== '';
            const { data } = await api.put('/hr/settings', {
                latitude: hasPoint ? Number(f.latitude) : null,
                longitude: hasPoint ? Number(f.longitude) : null,
                radiusM: Number(f.radiusM),
                officeStart: f.officeStart,
                officeEnd: f.officeEnd,
                graceMinutes: Number(f.graceMinutes),
                halfDayMinutes: Number(f.halfDayMinutes),
                requireSelfie: f.requireSelfie,
                requireLocation: f.requireLocation,
                blockOutside: f.blockOutside,
                weeklyOff: f.weeklyOff,
            });
            toast.success(data.message);
            setF({ ...data.data, latitude: data.data.latitude ?? '', longitude: data.data.longitude ?? '' });
            onSaved?.();
        } catch (err) {
            setErrors(err.fieldErrors || {});
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const hasPoint = f.latitude !== '' && f.longitude !== '';
    return (
        <div className="grid gap-6 xl:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>School ki location (geofence)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Staff ka check-in isi point se kitni door se hua, wo naapa jata hai. School ke andar khade hokar &quot;Meri location&quot; dabaiye.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <TextField label="Latitude" name="latitude" value={f.latitude} onChange={set('latitude')} error={errors.latitude} disabled={!canManage} />
                        <TextField label="Longitude" name="longitude" value={f.longitude} onChange={set('longitude')} error={errors.longitude} disabled={!canManage} />
                        <TextField label="Radius (m)" name="radiusM" type="number" min="30" max="5000" value={f.radiusM} onChange={set('radiusM')} error={errors.radiusM} disabled={!canManage} />
                    </div>
                    {canManage ? (
                        <Button variant="outline" onClick={useMine} disabled={locating}>
                            <LocateFixed /> {locating ? 'Location le rahe hain...' : 'Meri location use kariye'}
                        </Button>
                    ) : null}
                    {hasPoint ? (
                        <iframe
                            title="School location"
                            src={'https://maps.google.com/maps?q=' + f.latitude + ',' + f.longitude + '&z=17&output=embed'}
                            className="h-64 w-full rounded-xl border-0"
                            loading="lazy"
                        />
                    ) : (
                        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                            Location set nahi hai - abhi doori check nahi ho rahi.
                        </p>
                    )}
                </CardContent>
            </Card>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Timing</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2">
                        <TextField label="School shuru" name="officeStart" type="time" value={f.officeStart} onChange={set('officeStart')} error={errors.officeStart} disabled={!canManage} />
                        <TextField label="Chhutti" name="officeEnd" type="time" value={f.officeEnd} onChange={set('officeEnd')} error={errors.officeEnd} disabled={!canManage} />
                        <TextField label="Late ki chhoot (minute)" name="graceMinutes" type="number" min="0" value={f.graceMinutes} onChange={set('graceMinutes')} error={errors.graceMinutes} hint={'Iske baad aaye to Late'} disabled={!canManage} />
                        <TextField label="Half-day agar kaam kam (minute)" name="halfDayMinutes" type="number" min="30" value={f.halfDayMinutes} onChange={set('halfDayMinutes')} error={errors.halfDayMinutes} hint={Math.floor(f.halfDayMinutes / 60) + ' ghante se kam'} disabled={!canManage} />
                        <div className="sm:col-span-2">
                            <p className="mb-2 text-sm font-medium text-foreground">Weekly off</p>
                            <div className="flex flex-wrap gap-2">
                                {DAYS.map((d, i) => {
                                    const on = f.weeklyOff.includes(i);
                                    return (
                                        <button
                                            key={d}
                                            type="button"
                                            disabled={!canManage}
                                            onClick={() => setF((s) => ({ ...s, weeklyOff: on ? s.weeklyOff.filter((x) => x !== i) : [...s.weeklyOff, i] }))}
                                            className={cn('rounded-lg border px-3 py-1.5 text-sm', on ? 'border-primary bg-accent font-medium text-accent-foreground' : 'border-border text-muted-foreground')}
                                        >
                                            {d}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Rules</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Check label="Selfie zaroori" hint="Check-in par front camera se photo" checked={f.requireSelfie} onChange={set('requireSelfie')} />
                        <Check label="Location zaroori" hint="GPS band ho to check-in nahi" checked={f.requireLocation} onChange={set('requireLocation')} />
                        <Check label="Campus ke bahar se rok do" hint="Band = bahar se lagne do par flag karo. Chalu = radius ke bahar aur mock location par check-in hi nahi" checked={f.blockOutside} onChange={set('blockOutside')} />
                        {canManage ? (
                            <Button onClick={save} disabled={saving} className="w-full">
                                <Save /> {saving ? 'Saving...' : 'Save settings'}
                            </Button>
                        ) : null}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
