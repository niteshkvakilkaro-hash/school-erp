import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../lib/api';
import { useStudents } from '../context/StudentContext';
import { useTheme } from '../context/ThemeContext';
import { ChildSwitcher } from '../components/ChildSwitcher';
import { Card, Title, Subtle, Badge, Loader } from '../components/ui';

export default function TimetableScreen() {
    const { active, loading: studentsLoading } = useStudents();
    const { colors, radius } = useTheme();

    const [data, setData] = useState(null);
    const [day, setDay] = useState(null);
    const [busy, setBusy] = useState(true);

    const load = useCallback(async () => {
        if (!active) {
            setData(null);
            setBusy(false);
            return;
        }
        setBusy(true);
        try {
            const res = await api.get('/portal/students/' + active.id + '/timetable');
            setData(res.data.data);
            // Aaj ka din default, Sunday ho to Monday
            setDay(res.data.data.todayDow || 1);
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

    // Chune hue din ke periods - break hamesha, baaki tabhi jab class ho
    const rows = (data?.periods || []).filter((p) => p.isBreak || p.cells?.[day]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <View style={{ padding: 16, paddingBottom: 12 }}>
                <Title>Timetable</Title>
                <Subtle style={{ marginTop: 2 }}>
                    {active
                        ? (active.className || 'Unassigned') +
                          (active.sectionName ? ' - ' + active.sectionName : '')
                        : '-'}
                </Subtle>
            </View>

            <ChildSwitcher />

            {data?.days ? (
                <View style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ padding: 12, gap: 8 }}
                    >
                        {data.days.map((d) => {
                            const on = d.value === day;
                            const isToday = d.value === data.todayDow;
                            return (
                                <TouchableOpacity
                                    key={d.value}
                                    onPress={() => setDay(d.value)}
                                    activeOpacity={0.8}
                                    style={{
                                        paddingHorizontal: 16,
                                        paddingVertical: 9,
                                        borderRadius: radius.full,
                                        backgroundColor: on ? colors.primary : colors.card,
                                        borderWidth: StyleSheet.hairlineWidth,
                                        borderColor: on ? colors.primary : colors.border,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            fontWeight: '600',
                                            color: on ? colors.primaryForeground : colors.foreground,
                                        }}
                                    >
                                        {d.short}
                                        {isToday ? ' *' : ''}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            ) : null}

            <ScrollView
                contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
                refreshControl={
                    <RefreshControl refreshing={busy} onRefresh={load} tintColor={colors.primary} />
                }
            >
                {!data?.hasTimetable ? (
                    <Card>
                        <Subtle>Abhi timetable set nahi hua hai</Subtle>
                    </Card>
                ) : rows.length === 0 ? (
                    <Card>
                        <Subtle>Is din koi class nahi hai</Subtle>
                    </Card>
                ) : (
                    rows.map((p) => {
                        const cell = p.cells?.[day];
                        return (
                            <Card key={p.id} style={p.isBreak ? { backgroundColor: colors.muted } : undefined}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                                    <View style={{ width: 62 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }}>
                                            {p.startTime}
                                        </Text>
                                        <Subtle style={{ fontSize: 11 }}>{p.endTime}</Subtle>
                                    </View>

                                    <View style={{ flex: 1 }}>
                                        {p.isBreak ? (
                                            <Text
                                                style={{
                                                    fontSize: 14,
                                                    fontWeight: '600',
                                                    color: colors.mutedForeground,
                                                }}
                                            >
                                                {p.name}
                                            </Text>
                                        ) : (
                                            <>
                                                <Text
                                                    style={{
                                                        fontSize: 15,
                                                        fontWeight: '600',
                                                        color: colors.foreground,
                                                    }}
                                                >
                                                    {cell.subject}
                                                </Text>
                                                <Subtle>{cell.teacherName || 'No teacher'}</Subtle>
                                            </>
                                        )}
                                    </View>

                                    {!p.isBreak && cell?.roomNo ? <Badge tone="muted">{cell.roomNo}</Badge> : null}
                                </View>
                            </Card>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
