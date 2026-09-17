import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../lib/api';
import { useStudents } from '../context/StudentContext';
import { useTheme } from '../context/ThemeContext';
import { ChildSwitcher } from '../components/ChildSwitcher';
import { Card, Title, Subtle, Badge, Loader } from '../components/ui';

const TONE = { present: 'default', absent: 'danger', leave: 'warning', 'half-day': 'info' };
const LABEL = { present: 'Present', absent: 'Absent', leave: 'Leave', 'half-day': 'Half day' };

const fmt = (d) => {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
};

function Donut({ percent }) {
    const { colors } = useTheme();
    const value = percent ?? 0;
    const good = value >= 75;

    return (
        <View style={{ alignItems: 'center', gap: 6 }}>
            <View
                style={{
                    width: 96,
                    height: 96,
                    borderRadius: 48,
                    borderWidth: 10,
                    borderColor: good ? colors.primary : colors.warning,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Text style={{ fontSize: 22, fontWeight: '700', color: colors.foreground }}>
                    {percent == null ? '-' : value + '%'}
                </Text>
            </View>
            <Subtle>{good ? 'Achhi attendance' : 'Dhyan dene ki zaroorat'}</Subtle>
        </View>
    );
}

function Tile({ label, value, tone }) {
    const { colors, radius } = useTheme();
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
                padding: 12,
                gap: 2,
            }}
        >
            <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{label}</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: tone || colors.foreground }}>{value}</Text>
        </View>
    );
}

export default function AttendanceScreen() {
    const { active, loading: studentsLoading } = useStudents();
    const { colors } = useTheme();

    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(true);

    const load = useCallback(async () => {
        if (!active) {
            setData(null);
            setBusy(false);
            return;
        }
        setBusy(true);
        try {
            const res = await api.get('/portal/students/' + active.id + '/attendance');
            setData(res.data.data);
        } catch {
            setData(null);
        } finally {
            setBusy(false);
        }
    }, [active]);

    useEffect(() => {
        load();
    }, [load]);

    if (studentsLoading) return <Loader />;

    const counts = data?.counts || {};

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <View style={{ padding: 16, paddingBottom: 12 }}>
                <Title>Attendance</Title>
                <Subtle style={{ marginTop: 2 }}>
                    {data ? fmt(data.from) + ' se ab tak' : 'Loading...'}
                </Subtle>
            </View>

            <ChildSwitcher />

            <FlatList
                data={data?.records || []}
                keyExtractor={(i) => String(i.id)}
                contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
                refreshControl={
                    <RefreshControl refreshing={busy} onRefresh={load} tintColor={colors.primary} />
                }
                ListHeaderComponent={
                    !data ? null : (
                        <View style={{ gap: 12, marginBottom: 6 }}>
                            <Card>
                                <Donut percent={data.percent} />
                            </Card>

                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <Tile label="Present" value={counts.present || 0} tone={colors.primary} />
                                <Tile label="Absent" value={counts.absent || 0} tone={colors.destructive} />
                                <Tile label="Leave" value={counts.leave || 0} tone={colors.warning} />
                                <Tile label="Half day" value={counts['half-day'] || 0} />
                            </View>

                            <Subtle style={{ marginTop: 4, fontWeight: '600' }}>
                                RECENT DAYS ({data.marked} marked)
                            </Subtle>
                        </View>
                    )
                }
                ListEmptyComponent={
                    busy ? null : (
                        <Card>
                            <Subtle>Abhi koi attendance record nahi hai</Subtle>
                        </Card>
                    )
                }
                renderItem={({ item }) => (
                    <Card>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                            }}
                        >
                            <View>
                                <Text style={{ fontSize: 15, fontWeight: '500', color: colors.foreground }}>
                                    {fmt(item.date)}
                                </Text>
                                {item.remarks ? <Subtle>{item.remarks}</Subtle> : null}
                            </View>
                            <Badge tone={TONE[item.status] || 'muted'}>
                                {LABEL[item.status] || item.status}
                            </Badge>
                        </View>
                    </Card>
                )}
            />
        </SafeAreaView>
    );
}
