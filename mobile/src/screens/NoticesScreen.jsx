import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../lib/api';
import { useStudents } from '../context/StudentContext';
import { useTheme } from '../context/ThemeContext';
import { ChildSwitcher } from '../components/ChildSwitcher';
import { Card, Title, Subtle, Badge, Loader } from '../components/ui';

const CATEGORY_TONE = {
    general: 'muted',
    academic: 'info',
    event: 'default',
    holiday: 'warning',
    exam: 'danger',
    fee: 'warning',
    urgent: 'danger',
};

const fmt = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

export default function NoticesScreen() {
    const { active, loading: studentsLoading } = useStudents();
    const { colors, radius } = useTheme();

    const [items, setItems] = useState([]);
    const [filter, setFilter] = useState('all');
    const [busy, setBusy] = useState(true);
    const [openId, setOpenId] = useState(null);

    const load = useCallback(async () => {
        if (!active) {
            setItems([]);
            setBusy(false);
            return;
        }
        setBusy(true);
        try {
            const { data } = await api.get('/portal/students/' + active.id + '/notices');
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

    // Filter chips fixed catalogue se nahi, actual data se bante hain
    const categories = ['all', ...new Set(items.map((i) => i.category))];
    const visible = filter === 'all' ? items : items.filter((i) => i.category === filter);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <View style={{ padding: 16, paddingBottom: 12 }}>
                <Title>Notices</Title>
                <Subtle style={{ marginTop: 2 }}>{items.length} announcements</Subtle>
            </View>

            <ChildSwitcher />

            {categories.length > 1 ? (
                <View style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={categories}
                        keyExtractor={(c) => c}
                        contentContainerStyle={{ padding: 12, gap: 8 }}
                        renderItem={({ item: c }) => {
                            const on = c === filter;
                            return (
                                <TouchableOpacity
                                    onPress={() => setFilter(c)}
                                    activeOpacity={0.8}
                                    style={{
                                        paddingHorizontal: 14,
                                        paddingVertical: 8,
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
                                        {c === 'all' ? 'All' : cap(c)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
            ) : null}

            <FlatList
                data={visible}
                keyExtractor={(i) => String(i.id)}
                contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
                refreshControl={
                    <RefreshControl refreshing={busy} onRefresh={load} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                    busy ? null : (
                        <Card>
                            <Subtle>Abhi koi notice nahi hai</Subtle>
                        </Card>
                    )
                }
                renderItem={({ item }) => {
                    const expanded = openId === item.id;
                    return (
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => setOpenId(expanded ? null : item.id)}
                        >
                            <Card>
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'flex-start',
                                        justifyContent: 'space-between',
                                        gap: 10,
                                    }}
                                >
                                    <Text
                                        style={{
                                            flex: 1,
                                            fontSize: 16,
                                            fontWeight: '600',
                                            color: colors.foreground,
                                        }}
                                    >
                                        {item.title}
                                    </Text>
                                    <Badge tone={CATEGORY_TONE[item.category] || 'muted'}>
                                        {cap(item.category)}
                                    </Badge>
                                </View>

                                <Text
                                    numberOfLines={expanded ? undefined : 2}
                                    style={{ fontSize: 14, color: colors.foreground, marginTop: 8 }}
                                >
                                    {item.body}
                                </Text>

                                <View
                                    style={{
                                        flexDirection: 'row',
                                        flexWrap: 'wrap',
                                        gap: 12,
                                        marginTop: 12,
                                        paddingTop: 10,
                                        borderTopWidth: StyleSheet.hairlineWidth,
                                        borderTopColor: colors.border,
                                    }}
                                >
                                    <Subtle>{fmt(item.publishOn)}</Subtle>
                                    {item.eventDate ? (
                                        <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>
                                            Event: {fmt(item.eventDate)}
                                        </Text>
                                    ) : null}
                                    {item.forClass ? <Subtle>{item.forClass}</Subtle> : null}
                                </View>
                            </Card>
                        </TouchableOpacity>
                    );
                }}
            />
        </SafeAreaView>
    );
}
