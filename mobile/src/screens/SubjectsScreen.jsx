import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../lib/api';
import { useStudents } from '../context/StudentContext';
import { useTheme } from '../context/ThemeContext';
import { ChildSwitcher } from '../components/ChildSwitcher';
import { Card, Title, Subtle, Badge, Loader } from '../components/ui';

const TONE = { theory: 'default', practical: 'warning', elective: 'muted' };

export default function SubjectsScreen() {
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
            const { data } = await api.get('/portal/students/' + active.id + '/subjects');
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

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <View style={{ padding: 16, paddingBottom: 12 }}>
                <Title>Subjects</Title>
                <Subtle style={{ marginTop: 2 }}>
                    {active
                        ? (active.className || 'Unassigned') +
                          (active.sectionName ? ' - ' + active.sectionName : '')
                        : '-'}
                </Subtle>
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
                            <Subtle>Is class ke liye abhi koi subject set nahi hai</Subtle>
                        </Card>
                    )
                }
                renderItem={({ item }) => (
                    <Card>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                            <View style={{ flex: 1, gap: 4 }}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>
                                    {item.name}
                                </Text>
                                <Subtle>{item.code}</Subtle>
                                <Subtle style={{ marginTop: 2 }}>
                                    {item.teacherName
                                        ? 'Teacher: ' + item.teacherName
                                        : 'Teacher assign nahi hua'}
                                </Subtle>
                            </View>
                            <Badge tone={TONE[item.type] || 'default'}>{item.type}</Badge>
                        </View>

                        <View
                            style={{
                                flexDirection: 'row',
                                gap: 16,
                                marginTop: 12,
                                paddingTop: 10,
                                borderTopWidth: StyleSheet.hairlineWidth,
                                borderTopColor: colors.border,
                            }}
                        >
                            <Subtle>Max marks: {item.maxMarks}</Subtle>
                            <Subtle>Pass marks: {item.passMarks}</Subtle>
                        </View>
                    </Card>
                )}
            />
        </SafeAreaView>
    );
}
