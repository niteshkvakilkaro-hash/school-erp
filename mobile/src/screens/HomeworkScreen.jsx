import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../lib/api';
import { useStudents } from '../context/StudentContext';
import { useTheme } from '../context/ThemeContext';
import { ChildSwitcher } from '../components/ChildSwitcher';
import { Card, Title, Subtle, Badge, Loader } from '../components/ui';

const fmt = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

export default function HomeworkScreen() {
    const { active, loading: studentsLoading } = useStudents();
    const { colors } = useTheme();

    const [items, setItems] = useState([]);
    const [busy, setBusy] = useState(true);

    const load = useCallback(async () => {
        if (!active) {
            setItems([]);
            setBusy(false);
            return;
        }
        setBusy(true);
        try {
            const { data } = await api.get('/portal/students/' + active.id + '/homework');
            setItems(data.data);
        } catch {
            setItems([]);
        } finally {
            setBusy(false);
        }
    }, [active]);

    useEffect(() => {
        load();
    }, [load]);

    if (studentsLoading) return <Loader />;

    const pending = items.filter((i) => i.status === 'open').length;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <View style={{ padding: 16, paddingBottom: 12 }}>
                <Title>Homework</Title>
                <Subtle style={{ marginTop: 2 }}>{pending} pending</Subtle>
            </View>

            <ChildSwitcher />

            <FlatList
                data={items}
                keyExtractor={(i) => String(i.id)}
                contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
                refreshControl={
                    <RefreshControl refreshing={busy} onRefresh={load} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                    busy ? null : (
                        <Card>
                            <Subtle>Abhi koi homework nahi mila</Subtle>
                        </Card>
                    )
                }
                renderItem={({ item }) => (
                    <Card>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                            <View style={{ flex: 1, gap: 4 }}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>
                                    {item.title}
                                </Text>
                                <Subtle>{item.subject || 'Subject'}</Subtle>
                            </View>
                            {item.isOverdue ? (
                                <Badge tone="danger">Overdue</Badge>
                            ) : item.status === 'open' ? (
                                <Badge tone="success">Open</Badge>
                            ) : (
                                <Badge tone="muted">Closed</Badge>
                            )}
                        </View>

                        {item.description ? (
                            <Text style={{ fontSize: 14, color: colors.foreground, marginTop: 8 }}>
                                {item.description}
                            </Text>
                        ) : null}

                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                gap: 12,
                                marginTop: 12,
                                paddingTop: 10,
                                borderTopWidth: StyleSheet.hairlineWidth,
                                borderTopColor: colors.border,
                            }}
                        >
                            <Subtle>Assigned: {fmt(item.assignedDate)}</Subtle>
                            <Text
                                style={{
                                    fontSize: 13,
                                    fontWeight: '600',
                                    color: item.isOverdue ? colors.destructive : colors.mutedForeground,
                                }}
                            >
                                Due: {fmt(item.dueDate)}
                            </Text>
                        </View>

                        {item.teacherName ? (
                            <Subtle style={{ marginTop: 6 }}>Teacher: {item.teacherName}</Subtle>
                        ) : null}
                    </Card>
                )}
            />
        </SafeAreaView>
    );
}
