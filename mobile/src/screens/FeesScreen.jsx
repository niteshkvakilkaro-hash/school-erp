import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../lib/api';
import { useStudents } from '../context/StudentContext';
import { useTheme } from '../context/ThemeContext';
import { ChildSwitcher } from '../components/ChildSwitcher';
import { Card, Title, Subtle, Badge, Loader, Row } from '../components/ui';

const money = (v) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(Number(v || 0));

const fmt = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const STATUS_TONE = { paid: 'success', partial: 'warning', pending: 'danger', waived: 'muted' };

export default function FeesScreen() {
    const { active, loading: studentsLoading } = useStudents();
    const { colors, radius } = useTheme();

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
            const res = await api.get('/portal/students/' + active.id + '/fees');
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

    const s = data?.summary;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <View style={{ padding: 16, paddingBottom: 12 }}>
                <Title>Fees</Title>
                <Subtle style={{ marginTop: 2 }}>Aapke bachche ki fee details</Subtle>
            </View>

            <ChildSwitcher />

            <ScrollView
                contentContainerStyle={{ padding: 16, gap: 14 }}
                refreshControl={
                    <RefreshControl refreshing={busy} onRefresh={load} tintColor={colors.primary} />
                }
            >
                {!data ? (
                    <Card>
                        <Subtle>Abhi koi fee record nahi hai</Subtle>
                    </Card>
                ) : (
                    <>
                        <Card>
                            <View style={{ alignItems: 'center', gap: 6 }}>
                                <Subtle>Total fee</Subtle>
                                <Text style={{ fontSize: 32, fontWeight: '700', color: colors.foreground }}>
                                    {money(s.totalFee)}
                                </Text>
                            </View>

                            <View
                                style={{
                                    height: 8,
                                    borderRadius: radius.full,
                                    backgroundColor: colors.muted,
                                    overflow: 'hidden',
                                    marginTop: 14,
                                }}
                            >
                                <View
                                    style={{
                                        height: '100%',
                                        width: s.percent + '%',
                                        backgroundColor: colors.primary,
                                        borderRadius: radius.full,
                                    }}
                                />
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                                <View>
                                    <Subtle>Paid</Subtle>
                                    <Text style={{ fontSize: 17, fontWeight: '700', color: colors.primary }}>
                                        {money(s.paid)}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Subtle>Pending</Subtle>
                                    <Text
                                        style={{
                                            fontSize: 17,
                                            fontWeight: '700',
                                            color: s.pending > 0 ? colors.destructive : colors.mutedForeground,
                                        }}
                                    >
                                        {money(s.pending)}
                                    </Text>
                                </View>
                            </View>
                        </Card>

                        <Card>
                            <Subtle style={{ marginBottom: 8, fontWeight: '600' }}>FEE DETAILS</Subtle>
                            {data.lines.length === 0 ? (
                                <Subtle>Koi fee assign nahi hui</Subtle>
                            ) : (
                                data.lines.map((l, i) => (
                                    <View
                                        key={l.id}
                                        style={{
                                            paddingVertical: 12,
                                            borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                                            borderTopColor: colors.border,
                                        }}
                                    >
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                                gap: 10,
                                            }}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={{ fontSize: 15, fontWeight: '500', color: colors.foreground }}
                                                >
                                                    {l.feeHead}
                                                </Text>
                                                {l.dueDate ? <Subtle>Due {fmt(l.dueDate)}</Subtle> : null}
                                            </View>
                                            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                                <Text
                                                    style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}
                                                >
                                                    {money(l.amount)}
                                                </Text>
                                                <Badge tone={STATUS_TONE[l.status] || 'muted'}>{l.status}</Badge>
                                            </View>
                                        </View>
                                        {l.pending > 0 ? (
                                            <Text style={{ fontSize: 12, color: colors.destructive, marginTop: 4 }}>
                                                {money(l.pending)} baaki hai
                                            </Text>
                                        ) : null}
                                    </View>
                                ))
                            )}
                        </Card>

                        <Card>
                            <Subtle style={{ marginBottom: 6, fontWeight: '600' }}>RECENT PAYMENTS</Subtle>
                            {data.payments.length === 0 ? (
                                <Subtle>Abhi koi payment nahi hua</Subtle>
                            ) : (
                                data.payments.map((p) => (
                                    <Row
                                        key={p.id}
                                        label={p.receiptNo + ' - ' + p.feeHead}
                                        value={money(p.amount) + '  ' + p.mode.toUpperCase()}
                                    />
                                ))
                            )}
                        </Card>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
