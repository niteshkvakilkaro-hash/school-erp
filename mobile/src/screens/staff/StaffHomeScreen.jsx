import { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Card, Title, Subtle, Button, Avatar, Loader } from '../../components/ui';

const STATUS = {
    present: ['Present', 'success'],
    late: ['Late', 'warning'],
    'half-day': ['Half day', 'warning'],
    absent: ['Absent', 'danger'],
    leave: ['Leave', 'info'],
};

const hours = (m) => (m == null ? '' : Math.floor(m / 60) + 'h ' + (m % 60) + 'm');
const fmtDate = (ymd) => new Date(ymd + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

/** Hare card ke upar padhne layak - safed chip, rangeen text. */
function Chip({ color, children }) {
    const { colors, radius } = useTheme();
    return (
        <View style={{ backgroundColor: colors.card, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{children}</Text>
        </View>
    );
}

function Stat({ label, value, color }) {
    const { colors } = useTheme();
    return (
        <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: color || colors.foreground }}>{value}</Text>
            <Subtle style={{ fontSize: 11 }}>{label}</Subtle>
        </View>
    );
}

export default function StaffHomeScreen({ navigation, route }) {
    const { user } = useAuth();
    const { colors, radius } = useTheme();
    const [me, setMe] = useState(null);
    const [tt, setTt] = useState(null);
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState(null);
    const flash = route.params?.flash;

    const load = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
            const { data } = await api.get('/hr/me');
            setMe(data.data);
            if (data.data.isTeacher) {
                api.get('/timetable/teacher')
                    .then((r) => setTt(r.data.data))
                    .catch(() => setTt(null));
            }
        } catch (e) {
            setError(e.response?.data?.message || e.message);
        } finally {
            setBusy(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    if (!me && busy) return <Loader />;

    const r = me?.record;
    const todayNum = new Date().getDay(); // 1-6 = Mon-Sat
    const todayPeriods = tt ? tt.periods.map((p) => ({ ...p, cell: p.cells[todayNum] })).filter((p) => p.cell) : [];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={colors.primary} />}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Avatar name={user?.name || 'S'} />
                    <View style={{ flex: 1 }}>
                        <Title>Namaste, {(user?.name || '').split(' ')[0]}</Title>
                        <Subtle>{me ? fmtDate(me.today) : ''}</Subtle>
                    </View>
                </View>

                {flash ? (
                    <Card style={{ backgroundColor: colors.accent }}>
                        <Text style={{ color: colors.accentForeground, fontWeight: '600' }}>{'✅'} {flash}</Text>
                    </Card>
                ) : null}
                {error ? <Text style={{ color: colors.destructive }}>{error}</Text> : null}

                {me ? (
                    <View style={{ borderRadius: radius.xl, backgroundColor: colors.primary, padding: 18, gap: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: colors.primaryForeground, opacity: 0.85, fontSize: 13 }}>Aaj ki attendance</Text>
                            <Text style={{ color: colors.primaryForeground, opacity: 0.85, fontSize: 12 }}>
                                {me.policy.officeStart} - {me.policy.officeEnd}
                            </Text>
                        </View>

                        {me.onLeave ? (
                            <Text style={{ color: colors.primaryForeground, fontSize: 20, fontWeight: '700' }}>Aaj aapki chhutti hai {'\u{1F334}'}</Text>
                        ) : me.isOffDay && !r ? (
                            <Text style={{ color: colors.primaryForeground, fontSize: 20, fontWeight: '700' }}>Aaj weekly off hai</Text>
                        ) : (
                            <View style={{ flexDirection: 'row', gap: 24 }}>
                                <View>
                                    <Text style={{ color: colors.primaryForeground, opacity: 0.8, fontSize: 12 }}>Check-in</Text>
                                    <Text style={{ color: colors.primaryForeground, fontSize: 24, fontWeight: '700' }}>{r?.inTime || '--:--'}</Text>
                                </View>
                                <View>
                                    <Text style={{ color: colors.primaryForeground, opacity: 0.8, fontSize: 12 }}>Check-out</Text>
                                    <Text style={{ color: colors.primaryForeground, fontSize: 24, fontWeight: '700' }}>{r?.outTime || '--:--'}</Text>
                                </View>
                                {r?.workMinutes != null ? (
                                    <View>
                                        <Text style={{ color: colors.primaryForeground, opacity: 0.8, fontSize: 12 }}>Kaam</Text>
                                        <Text style={{ color: colors.primaryForeground, fontSize: 24, fontWeight: '700' }}>{hours(r.workMinutes)}</Text>
                                    </View>
                                ) : null}
                            </View>
                        )}

                        {r ? (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                <Chip color={r.status === 'present' ? colors.success : r.status === 'absent' ? colors.destructive : colors.warning}>
                                    {STATUS[r.status]?.[0] || r.status}
                                </Chip>
                                {r.inDistance != null ? (
                                    <Chip color={r.inOutside ? colors.destructive : colors.primary}>
                                        {r.inOutside ? 'Campus ke bahar' : 'Campus me'} ({r.inDistance} m)
                                    </Chip>
                                ) : null}
                                {r.source === 'manual' && !r.inAt ? <Chip color={colors.mutedForeground}>Admin ne mark kiya</Chip> : null}
                            </View>
                        ) : null}

                        {!me.onLeave && (!r || !r.inAt) ? (
                            <TouchableOpacity
                                onPress={() => navigation.navigate('CheckIn', { mode: 'in', policy: me.policy })}
                                style={{ backgroundColor: colors.card, borderRadius: radius.lg, paddingVertical: 14, alignItems: 'center' }}
                            >
                                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>{'\u{1F4F8}'}  Check-in kijiye</Text>
                            </TouchableOpacity>
                        ) : r?.inAt && !r.outAt ? (
                            <TouchableOpacity
                                onPress={() => navigation.navigate('CheckIn', { mode: 'out', policy: me.policy })}
                                style={{ borderWidth: 1.5, borderColor: colors.primaryForeground, borderRadius: radius.lg, paddingVertical: 12, alignItems: 'center' }}
                            >
                                <Text style={{ color: colors.primaryForeground, fontWeight: '700', fontSize: 15 }}>Check-out kijiye</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                ) : null}

                {me ? (
                    <Card>
                        <Subtle style={{ fontWeight: '600' }}>IS MAHINE</Subtle>
                        <View style={{ flexDirection: 'row', marginTop: 4 }}>
                            <Stat label="Present" value={me.month.present} color={colors.success} />
                            <Stat label="Late" value={me.month.late} color={colors.warning} />
                            <Stat label="Half day" value={me.month['half-day']} />
                            <Stat label="Leave" value={me.month.leave} />
                        </View>
                    </Card>
                ) : null}

                {me?.sections?.length ? (
                    <Card>
                        <Subtle style={{ fontWeight: '600', marginBottom: 8 }}>MERI CLASSES</Subtle>
                        {me.sections.map((s) => (
                            <TouchableOpacity
                                key={s.id}
                                onPress={() => navigation.navigate('Class', { classId: s.classId, sectionId: s.id, label: s.className + ' ' + s.name, at: Date.now() })}
                                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}
                            >
                                <Text style={{ fontSize: 15, color: colors.foreground, fontWeight: '500' }}>
                                    {s.className} - {s.name}
                                </Text>
                                <Text style={{ color: colors.primary, fontWeight: '600' }}>Attendance {'›'}</Text>
                            </TouchableOpacity>
                        ))}
                    </Card>
                ) : null}

                {todayPeriods.length ? (
                    <Card>
                        <Subtle style={{ fontWeight: '600', marginBottom: 8 }}>AAJ KE PERIODS</Subtle>
                        {todayPeriods.map((p) => (
                            <View key={p.id} style={{ flexDirection: 'row', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                                <Text style={{ width: 92, color: colors.mutedForeground, fontSize: 13 }}>
                                    {p.startTime?.slice(0, 5)}-{p.endTime?.slice(0, 5)}
                                </Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.foreground, fontWeight: '600' }}>{p.cell.subject || p.name}</Text>
                                    <Subtle>
                                        {p.cell.className} {p.cell.sectionName || ''}
                                        {p.cell.roomNo ? ' - ' + p.cell.roomNo : ''}
                                    </Subtle>
                                </View>
                            </View>
                        ))}
                    </Card>
                ) : null}

                {me?.policy && !me.policy.school ? (
                    <Subtle style={{ textAlign: 'center' }}>School ki location abhi set nahi hai - admin se kahiye.</Subtle>
                ) : null}
                <Button title="Refresh" variant="outline" onPress={load} />
            </ScrollView>
        </SafeAreaView>
    );
}
