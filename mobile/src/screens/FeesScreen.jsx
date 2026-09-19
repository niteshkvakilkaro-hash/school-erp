import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Platform, Linking, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../lib/api';
import { useStudents } from '../context/StudentContext';
import { useTheme } from '../context/ThemeContext';
import { ChildSwitcher } from '../components/ChildSwitcher';
import { Card, Title, Subtle, Badge, Loader, Row, Button } from '../components/ui';

// Payment page par jaane se pehle order yaad rakhte hain - wapas aane par status dikhane ke liye
const PENDING_KEY = 'erpsc-pending-payment';

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
    const [payOpts, setPayOpts] = useState(null);
    const [selected, setSelected] = useState({});
    const [paying, setPaying] = useState(false);
    const [payMsg, setPayMsg] = useState(null); // { tone, text }

    const load = useCallback(async () => {
        if (!active) {
            setData(null);
            setBusy(false);
            return;
        }
        setBusy(true);
        try {
            const [res, opts] = await Promise.all([
                api.get('/portal/students/' + active.id + '/fees'),
                api.get('/portal/students/' + active.id + '/pay-options').catch(() => null),
            ]);
            setData(res.data.data);
            setPayOpts(opts?.data?.data || null);
            // Default: saari baaki fees chuni hui
            setSelected(Object.fromEntries(res.data.data.lines.filter((l) => l.pending > 0).map((l) => [l.id, true])));
        } catch {
            setData(null);
        } finally {
            setBusy(false);
        }
    }, [active]);

    useEffect(() => {
        load();
    }, [load]);

    // Payment page se lautne par - order ka haal dekho aur fees refresh
    const checkPending = useCallback(async () => {
        let saved = null;
        try {
            saved = JSON.parse((await AsyncStorage.getItem(PENDING_KEY)) || 'null');
        } catch {
            saved = null;
        }
        if (!saved) return;
        try {
            const { data: res } = await api.get('/portal/students/' + saved.studentId + '/pay/' + saved.ref);
            const o = res.data;
            if (o.status === 'paid') {
                setPayMsg({ tone: 'ok', text: 'Payment ho gaya ' + money(o.amount) + ' - receipt ' + o.receiptNos.join(', ') });
                await AsyncStorage.removeItem(PENDING_KEY);
                load();
            } else if (o.status === 'failed' || o.status === 'expired') {
                setPayMsg({ tone: 'err', text: 'Payment nahi hua' + (o.failureReason ? ' - ' + o.failureReason : '') + '. Dobara try kar sakte hain.' });
                await AsyncStorage.removeItem(PENDING_KEY);
            } else {
                setPayMsg({ tone: 'wait', text: 'Payment ' + o.ref + ' abhi pura nahi hua. Pay kar diya ho to thodi der me refresh kijiye.' });
            }
        } catch {
            /* network - agli baar */
        }
    }, [load]);

    useEffect(() => {
        checkPending();
        const sub = AppState.addEventListener('change', (st) => st === 'active' && checkPending());
        return () => sub.remove();
    }, [checkPending]);

    const payNow = async () => {
        const ids = Object.keys(selected).filter((k) => selected[k]).map(Number);
        if (!ids.length) return setPayMsg({ tone: 'err', text: 'Kam se kam ek fee chuniye' });
        setPaying(true);
        setPayMsg(null);
        try {
            const { data: res } = await api.post('/portal/students/' + active.id + '/pay', { studentFeeIds: ids });
            await AsyncStorage.setItem(PENDING_KEY, JSON.stringify({ ref: res.data.ref, studentId: active.id }));
            if (Platform.OS === 'web') {
                // Popup blocker se bachne ke liye isi tab me - "App par wapas" se laut aate hain
                window.location.assign(res.data.payUrl);
            } else {
                await Linking.openURL(res.data.payUrl);
                setPayMsg({ tone: 'wait', text: 'Payment page khula hai - pay karke app par wapas aaiye.' });
            }
        } catch (e) {
            setPayMsg({ tone: 'err', text: e.message });
        } finally {
            setPaying(false);
        }
    };

    if (studentsLoading) return <Loader />;

    const s = data?.summary;
    const canPay = payOpts?.enabled && s?.pending > 0;
    const payTotal = (data?.lines || []).filter((l) => selected[l.id]).reduce((a, l) => a + l.pending, 0);
    const msgColor = payMsg ? (payMsg.tone === 'ok' ? colors.success : payMsg.tone === 'err' ? colors.destructive : colors.warning) : null;

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

                        {payMsg ? (
                            <Card style={{ borderColor: msgColor, borderWidth: 1 }}>
                                <Text style={{ color: msgColor, fontWeight: '600' }}>
                                    {payMsg.tone === 'ok' ? '\u2705 ' : ''}
                                    {payMsg.text}
                                </Text>
                                {payMsg.tone === 'wait' ? (
                                    <TouchableOpacity onPress={checkPending} style={{ marginTop: 8 }}>
                                        <Text style={{ color: colors.primary, fontWeight: '600' }}>Status dekhiye</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </Card>
                        ) : null}

                        {canPay ? (
                            <Card style={{ gap: 10 }}>
                                <Subtle style={{ fontWeight: '600' }}>ONLINE BHARIYE</Subtle>
                                <Subtle>Neeche fee par tap karke chuniye - UPI, card ya netbanking.</Subtle>
                                <Button
                                    title={'Pay online ' + money(payTotal)}
                                    onPress={payNow}
                                    loading={paying}
                                    disabled={payTotal <= 0}
                                />
                                {payOpts.provider === 'demo' ? (
                                    <Subtle style={{ fontSize: 12, textAlign: 'center' }}>Demo mode - asli paisa nahi katega</Subtle>
                                ) : null}
                            </Card>
                        ) : null}

                        <Card>
                            <Subtle style={{ marginBottom: 8, fontWeight: '600' }}>FEE DETAILS</Subtle>
                            {data.lines.length === 0 ? (
                                <Subtle>Koi fee assign nahi hui</Subtle>
                            ) : (
                                data.lines.map((l, i) => (
                                    <TouchableOpacity
                                        key={l.id}
                                        disabled={!canPay || l.pending <= 0}
                                        onPress={() => setSelected((m) => ({ ...m, [l.id]: !m[l.id] }))}
                                        accessibilityRole={canPay && l.pending > 0 ? 'checkbox' : undefined}
                                        accessibilityState={canPay && l.pending > 0 ? { checked: Boolean(selected[l.id]) } : undefined}
                                        accessibilityLabel={l.feeHead}
                                        style={{
                                            paddingVertical: 12,
                                            borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                                            borderTopColor: colors.border,
                                            flexDirection: 'row',
                                            gap: 10,
                                        }}
                                    >
                                        {canPay ? (
                                            <View
                                                style={{
                                                    width: 22,
                                                    height: 22,
                                                    marginTop: 1,
                                                    borderRadius: 6,
                                                    borderWidth: 2,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderColor: l.pending > 0 ? colors.primary : colors.border,
                                                    backgroundColor: selected[l.id] && l.pending > 0 ? colors.primary : 'transparent',
                                                }}
                                            >
                                                {selected[l.id] && l.pending > 0 ? (
                                                    <Text style={{ color: colors.primaryForeground, fontSize: 13, fontWeight: '800' }}>{'\u2713'}</Text>
                                                ) : null}
                                            </View>
                                        ) : null}
                                        <View style={{ flex: 1 }}>
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
                                    </TouchableOpacity>
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
