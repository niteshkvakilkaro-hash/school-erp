import { useState } from 'react';
import { MapPin, AlertTriangle, LogOut, Clock, ShieldAlert, Pencil, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import { SecureImage, photoPath } from './SecureImage';

export const STATE = {
    present: { label: 'Present', tone: 'success' },
    late: { label: 'Late', tone: 'warning' },
    'half-day': { label: 'Half day', tone: 'warning' },
    absent: { label: 'Absent', tone: 'danger' },
    leave: { label: 'On leave', tone: 'secondary' },
    'not-yet': { label: 'Abhi nahi aaye', tone: 'muted' },
    off: { label: 'Chhutti ka din', tone: 'muted' },
};

const hours = (m) => (m == null ? null : Math.floor(m / 60) + 'h ' + (m % 60) + 'm');
const mapLink = (lat, lng) => 'https://maps.google.com/?q=' + lat + ',' + lng;

function Distance({ m, outside, radius }) {
    if (m == null) return <span className="text-xs text-muted-foreground">Location nahi</span>;
    return (
        <span className={cn('inline-flex items-center gap-1 text-xs font-medium', outside ? 'text-destructive' : 'text-primary')}>
            <MapPin className="h-3.5 w-3.5" />
            {m < 1000 ? m + ' m' : (m / 1000).toFixed(1) + ' km'}
            {outside ? ' - campus ke bahar' : radius ? ' - campus me' : ''}
        </span>
    );
}

/** Ek staff ka poora din - dono selfie, map, time. */
function DetailModal({ row, policy, onClose, onMark, canManage }) {
    if (!row) return null;
    const r = row.record;
    return (
        <Modal
            open
            onOpenChange={(v) => !v && onClose()}
            title={row.user.name}
            description={row.user.role + (r?.source === 'manual' ? ' - admin ne mark kiya' : '')}
            size="lg"
            footer={
                canManage ? (
                    <Button variant="outline" onClick={() => onMark(row)}>
                        <Pencil /> Status badliye
                    </Button>
                ) : null
            }
        >
            {!r ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Is din koi check-in nahi</p>
            ) : (
                <div className="grid gap-5 md:grid-cols-2">
                    {[
                        ['in', 'Check-in', r.inTime, r.hasInPhoto, r.inLat, r.inLng, r.inDistance, r.inOutside, r.inMocked, r.inAccuracy],
                        ['out', 'Check-out', r.outTime, r.hasOutPhoto, r.outLat, r.outLng, r.outDistance, r.outOutside, r.outMocked, r.outAccuracy],
                    ].map(([w, label, time, hasPhoto, lat, lng, dist, outside, mocked, acc]) => (
                        <div key={w} className="space-y-3 rounded-xl border border-border p-3">
                            <div className="flex items-center justify-between">
                                <p className="font-medium text-foreground">{label}</p>
                                <span className="font-mono text-sm text-foreground">{time || '--:--'}</span>
                            </div>
                            {hasPhoto ? (
                                <SecureImage path={photoPath(r.id, w)} alt={label + ' selfie'} className="aspect-[3/4] w-full rounded-lg" />
                            ) : (
                                <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
                                    {time ? 'Selfie nahi li' : 'Abhi nahi'}
                                </div>
                            )}
                            {lat != null ? (
                                <>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Distance m={dist} outside={outside} radius={policy?.radiusM} />
                                        {acc != null ? <span className="text-xs text-muted-foreground">GPS ±{acc} m</span> : null}
                                        {mocked ? <Badge variant="danger">Mock location</Badge> : null}
                                    </div>
                                    <iframe
                                        title={label + ' map'}
                                        src={'https://maps.google.com/maps?q=' + lat + ',' + lng + '&z=16&output=embed'}
                                        className="h-40 w-full rounded-lg border-0"
                                        loading="lazy"
                                    />
                                    <a href={mapLink(lat, lng)} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline">
                                        Google Maps me kholiye
                                    </a>
                                </>
                            ) : null}
                        </div>
                    ))}
                    {r.note ? <p className="text-sm text-muted-foreground md:col-span-2">Note: {r.note}</p> : null}
                </div>
            )}
        </Modal>
    );
}

export function LiveBoard({ data, canManage, onMark }) {
    const [open, setOpen] = useState(null);
    const [filter, setFilter] = useState('all');
    const rows = data.rows.filter((r) => {
        if (filter === 'all') return true;
        if (filter === 'in') return ['present', 'late', 'half-day'].includes(r.state);
        if (filter === 'missing') return r.state === 'not-yet' || r.state === 'absent';
        if (filter === 'flags') return r.record?.inOutside || r.record?.inMocked || r.record?.outMocked;
        return r.state === filter;
    });
    const c = data.counts;
    const FILTERS = [
        ['all', 'Sab', c.total],
        ['in', 'Aa gaye', c.present + c.late + c['half-day']],
        ['late', 'Late', c.late],
        ['missing', data.date === data.today ? 'Nahi aaye' : 'Absent', c.notYet + c.absent],
        ['leave', 'Leave', c.leave],
        ['flags', 'Flags', c.outside + c.mocked],
    ];

    return (
        <>
            <div className="mb-4 flex flex-wrap gap-2">
                {FILTERS.map(([k, label, n]) => (
                    <button
                        key={k}
                        onClick={() => setFilter(k)}
                        className={cn(
                            'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                            filter === k ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {label} <span className="ml-1 opacity-70">{n}</span>
                    </button>
                ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((row) => {
                    const r = row.record;
                    const st = STATE[row.state];
                    const flagged = r?.inOutside || r?.inMocked || r?.outMocked;
                    return (
                        <Card key={row.user.id} className={cn('overflow-hidden transition-shadow hover:shadow-md', flagged && 'border-destructive/40')}>
                            <CardContent className="flex gap-4 p-4">
                                <button onClick={() => setOpen(row)} className="shrink-0" aria-label={'Details: ' + row.user.name}>
                                    {r?.hasInPhoto ? (
                                        <SecureImage path={photoPath(r.id, 'in')} alt={row.user.name + ' selfie'} className="h-20 w-16 rounded-lg" />
                                    ) : (
                                        <div className="flex h-20 w-16 items-center justify-center rounded-lg bg-muted text-lg font-semibold text-muted-foreground">
                                            {row.user.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                                        </div>
                                    )}
                                </button>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <button onClick={() => setOpen(row)} className="min-w-0 text-left">
                                            <p className="truncate font-medium text-foreground">{row.user.name}</p>
                                            <p className="truncate text-xs text-muted-foreground">{row.user.role}</p>
                                        </button>
                                        <Badge variant={st.tone}>{st.label}</Badge>
                                    </div>
                                    {r?.inTime ? (
                                        <div className="mt-2 space-y-1">
                                            <p className="flex items-center gap-3 text-sm text-foreground">
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {r.inTime}
                                                </span>
                                                {r.outTime ? (
                                                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                                                        <LogOut className="h-3.5 w-3.5" /> {r.outTime} ({hours(r.workMinutes)})
                                                    </span>
                                                ) : null}
                                            </p>
                                            <Distance m={r.inDistance} outside={r.inOutside} radius={data.policy.radiusM} />
                                            {r.inMocked || r.outMocked ? (
                                                <p className="flex items-center gap-1 text-xs font-medium text-destructive">
                                                    <ShieldAlert className="h-3.5 w-3.5" /> Nakli (mock) location
                                                </p>
                                            ) : null}
                                        </div>
                                    ) : row.leave ? (
                                        <p className="mt-2 text-xs capitalize text-muted-foreground">
                                            {row.leave.type} leave - {row.leave.from} se {row.leave.to}
                                        </p>
                                    ) : r?.source === 'manual' ? (
                                        <p className="mt-2 text-xs text-muted-foreground">Admin ne mark kiya{r.note ? ': ' + r.note : ''}</p>
                                    ) : (
                                        <div className="mt-2 flex items-center gap-3">
                                            {row.user.phone ? (
                                                <a href={'tel:' + row.user.phone} className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                                                    <Phone className="h-3.5 w-3.5" /> {row.user.phone}
                                                </a>
                                            ) : null}
                                            {canManage && row.state !== 'off' ? (
                                                <button onClick={() => onMark(row)} className="text-xs font-medium text-muted-foreground hover:text-foreground">
                                                    Mark kariye
                                                </button>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
                {!rows.length ? (
                    <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                        <AlertTriangle className="mx-auto mb-2 h-5 w-5" /> Is filter me koi nahi
                    </p>
                ) : null}
            </div>

            <DetailModal
                row={open}
                policy={data.policy}
                canManage={canManage}
                onClose={() => setOpen(null)}
                onMark={(row) => {
                    setOpen(null);
                    onMark(row);
                }}
            />
        </>
    );
}
