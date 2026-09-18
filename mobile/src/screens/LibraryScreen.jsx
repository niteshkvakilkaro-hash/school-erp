import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
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
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

function BookCard({ item }) {
    const { colors } = useTheme();
    const overdue = item.status === 'overdue';
    return (
        <Card>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}>{item.book?.title}</Text>
                    <Subtle>{item.book?.author || item.book?.code}</Subtle>
                </View>
                <Badge tone={overdue ? 'danger' : item.status === 'returned' ? 'muted' : 'success'}>
                    {overdue ? 'Overdue' : item.status === 'returned' ? 'Returned' : 'Issued'}
                </Badge>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <Subtle>Issued {fmt(item.issuedOn)}</Subtle>
                <Text style={{ fontSize: 13, fontWeight: '600', color: overdue ? colors.destructive : colors.mutedForeground }}>
                    {item.status === 'returned' ? 'Returned ' + fmt(item.returnedOn) : 'Due ' + fmt(item.dueOn)}
                </Text>
            </View>
            {item.fine > 0 ? (
                <Text style={{ fontSize: 12, color: colors.destructive, marginTop: 6 }}>
                    Fine Rs {item.fine}
                    {item.status === 'returned' ? (item.finePaid ? ' (paid)' : ' (baaki)') : ' - roz badh raha hai'}
                </Text>
            ) : null}
        </Card>
    );
}

export default function LibraryScreen() {
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
            const res = await api.get('/portal/students/' + active.id + '/library');
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

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <View style={{ padding: 16, paddingBottom: 12 }}>
                <Title>Library</Title>
                <Subtle style={{ marginTop: 2 }}>
                    {data
                        ? data.current.length + ' books abhi paas hain (max ' + data.rules.maxBooksPerStudent + ')'
                        : 'Loading...'}
                </Subtle>
            </View>

            <ChildSwitcher />

            <ScrollView
                contentContainerStyle={{ padding: 16, gap: 10 }}
                refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={colors.primary} />}
            >
                <Subtle style={{ fontWeight: '600' }}>ABHI PAAS</Subtle>
                {!data || data.current.length === 0 ? (
                    <Card>
                        <Subtle>Koi book issued nahi hai</Subtle>
                    </Card>
                ) : (
                    data.current.map((i) => <BookCard key={i.id} item={i} />)
                )}

                {data?.history?.length ? (
                    <>
                        <Subtle style={{ fontWeight: '600', marginTop: 8 }}>HISTORY</Subtle>
                        {data.history.map((i) => (
                            <BookCard key={i.id} item={i} />
                        ))}
                    </>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}
