import { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { Card, Title, Subtle, Button, Badge, Input } from '../../components/ui';

const TYPES = [
    ['casual', 'Casual'],
    ['sick', 'Sick'],
    ['earned', 'Earned'],
    ['unpaid', 'Unpaid'],
    ['other', 'Other'],
];
const TONE = { pending: 'warning', approved: 'success', rejected: 'danger', cancelled: 'muted' };

const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const plus = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return ymd(d);
};
const nice = (s) => new Date(s + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function Chip({ on, label, onPress }) {
    const { colors, radius } = useTheme();
    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: on ? colors.primary : colors.border,
                backgroundColor: on ? colors.accent : 'transparent',
            }}
        >
            <Text style={{ color: on ? colors.accentForeground : colors.mutedForeground, fontWeight: '600', fontSize: 13 }}>{label}</Text>
        </TouchableOpacity>
    );
}

export default function LeavesScreen() {
    const { colors } = useTheme();
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(false);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ type: 'casual', fromDate: plus(1), toDate: plus(1), reason: '' });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);

    const load = useCallback(async () => {
        setBusy(true);
        try {
            const { data: res } = await api.get('/hr/me/leaves');
            setData(res.data);
        } catch (e) {
            setMsg(e.response?.data?.message || e.message);
        } finally {
            setBusy(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    const apply = async () => {
        setSaving(true);
        setErrors({});
        setMsg(null);
        try {
            const { data: res } = await api.post('/hr/me/leaves', form);
            setMsg('✅ ' + res.message);
            setOpen(false);
            setForm({ type: 'casual', fromDate: plus(1), toDate: plus(1), reason: '' });
            load();
        } catch (e) {
            const errs = {};
            for (const x of e.response?.data?.errors || []) errs[x.field] = x.message;
            setErrors(errs);
            setMsg(e.response?.data?.message || e.message);
        } finally {
            setSaving(false);
        }
    };

    const cancel = (l) => {
        const run = async () => {
            try {
                await api.post('/hr/me/leaves/' + l.id + '/cancel');
                load();
            } catch (e) {
                setMsg(e.response?.data?.message || e.message);
            }
        };
        // Web par Alert ke buttons nahi chalte
        if (typeof window !== 'undefined' && window.confirm) {
            if (window.confirm('Leave cancel karni hai?')) run();
        } else {
            Alert.alert('Leave cancel', 'Leave cancel karni hai?', [{ text: 'Nahi' }, { text: 'Haan', style: 'destructive', onPress: run }]);
        }
    };

    const used = data?.usedThisYear || {};
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={colors.primary} />}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title>Leaves</Title>
                    {!open ? <Button title="+ Apply" onPress={() => setOpen(true)} style={{ height: 40 }} /> : null}
                </View>
                <Subtle>
                    Is saal li: {Object.keys(used).length ? Object.entries(used).map(([k, v]) => k + ' ' + v).join(', ') : 'koi nahi'}
                </Subtle>
                {msg ? <Text style={{ color: msg.startsWith('✅') ? colors.success : colors.destructive }}>{msg}</Text> : null}

                {open ? (
                    <Card style={{ gap: 12 }}>
                        <Text style={{ fontWeight: '700', fontSize: 16, color: colors.foreground }}>Nayi leave</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {TYPES.map(([k, l]) => (
                                <Chip key={k} on={form.type === k} label={l} onPress={() => setForm((f) => ({ ...f, type: k }))} />
                            ))}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Chip label="Aaj" on={form.fromDate === plus(0) && form.toDate === plus(0)} onPress={() => setForm((f) => ({ ...f, fromDate: plus(0), toDate: plus(0) }))} />
                            <Chip label="Kal" on={form.fromDate === plus(1) && form.toDate === plus(1)} onPress={() => setForm((f) => ({ ...f, fromDate: plus(1), toDate: plus(1) }))} />
                            <Chip label="Parson" on={form.fromDate === plus(2) && form.toDate === plus(2)} onPress={() => setForm((f) => ({ ...f, fromDate: plus(2), toDate: plus(2) }))} />
                        </View>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Input label="Se (YYYY-MM-DD)" value={form.fromDate} onChangeText={(v) => setForm((f) => ({ ...f, fromDate: v.trim() }))} error={errors.fromDate} autoCapitalize="none" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Input label="Tak" value={form.toDate} onChangeText={(v) => setForm((f) => ({ ...f, toDate: v.trim() }))} error={errors.toDate} autoCapitalize="none" />
                            </View>
                        </View>
                        <Input label="Reason" value={form.reason} onChangeText={(v) => setForm((f) => ({ ...f, reason: v }))} error={errors.reason} placeholder="Kyun chahiye" multiline />
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Button title="Cancel" variant="outline" onPress={() => setOpen(false)} style={{ flex: 1 }} />
                            <Button title="Apply" onPress={apply} loading={saving} style={{ flex: 1 }} />
                        </View>
                    </Card>
                ) : null}

                {(data?.items || []).map((l) => (
                    <Card key={l.id}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontWeight: '600', fontSize: 15, color: colors.foreground, textTransform: 'capitalize' }}>
                                    {l.type} - {l.days} din
                                </Text>
                                <Subtle>
                                    {nice(l.fromDate)}
                                    {l.toDate !== l.fromDate ? ' se ' + nice(l.toDate) : ''}
                                </Subtle>
                            </View>
                            <Badge tone={TONE[l.status]}>{l.status}</Badge>
                        </View>
                        <Text style={{ marginTop: 8, color: colors.foreground }}>{l.reason}</Text>
                        {l.reviewNote ? <Subtle style={{ marginTop: 4 }}>Jawab: {l.reviewNote}{l.reviewedBy ? ' - ' + l.reviewedBy.name : ''}</Subtle> : null}
                        {l.status === 'pending' || (l.status === 'approved' && l.fromDate > plus(0)) ? (
                            <TouchableOpacity onPress={() => cancel(l)} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                                <Text style={{ color: colors.destructive, fontWeight: '600' }}>Cancel kijiye</Text>
                            </TouchableOpacity>
                        ) : null}
                    </Card>
                ))}
                {data && !data.items.length ? (
                    <Card>
                        <Subtle>Abhi tak koi leave nahi</Subtle>
                    </Card>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}
