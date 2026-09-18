import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import api from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { Card, Subtle, Badge, Loader } from '../../components/ui';

const STATUS = {
    present: ['Present', 'success'],
    late: ['Late', 'warning'],
    'half-day': ['Half day', 'warning'],
    absent: ['Absent', 'danger'],
    leave: ['Leave', 'info'],
    off: ['Off', 'muted'],
    pending: ['Aaj - abhi nahi', 'muted'],
};

const shift = (month, n) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
};

/** Mahine bhar ki apni attendance - din ba din. */
export default function MyAttendanceScreen() {
    const { colors } = useTheme();
    const [month, setMonth] = useState(null);
    const [data, setData] = useState(null);

    const load = useCallback(async (m) => {
        setData(null);
        const { data: res } = await api.get('/hr/me/attendance', { params: m ? { month: m } : {} });
        setData(res.data);
        setMonth(res.data.month);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const label = month ? new Date(month + '-01T12:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '';
    const thisMonth = new Date().toISOString().slice(0, 7);

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
                <TouchableOpacity onPress={() => load(shift(month, -1))} disabled={!month}>
                    <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 16 }}>{'‹'} Pichhla</Text>
                </TouchableOpacity>
                <Text style={{ fontWeight: '700', fontSize: 16, color: colors.foreground }}>{label}</Text>
                <TouchableOpacity onPress={() => load(shift(month, 1))} disabled={!month || month >= thisMonth}>
                    <Text style={{ color: month >= thisMonth ? colors.mutedForeground : colors.primary, fontWeight: '600', fontSize: 16 }}>Agla {'›'}</Text>
                </TouchableOpacity>
            </View>
            {!data ? (
                <Loader />
            ) : (
                <FlatList
                    data={data.days}
                    keyExtractor={(d) => d.date}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 8 }}
                    ListHeaderComponent={
                        <Subtle style={{ marginBottom: 6 }}>
                            {Object.entries(data.totals)
                                .map(([k, v]) => (STATUS[k]?.[0] || k) + ' ' + v)
                                .join('  |  ')}
                        </Subtle>
                    }
                    ListEmptyComponent={<Subtle>Is mahine ka koi din nahi</Subtle>}
                    renderItem={({ item }) => {
                        const r = item.record;
                        const st = STATUS[item.status] || [item.status, 'muted'];
                        return (
                            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
                                <View style={{ width: 44, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>{Number(item.date.slice(8))}</Text>
                                    <Subtle style={{ fontSize: 11 }}>{new Date(item.date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short' })}</Subtle>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.foreground }}>
                                        {r?.inTime ? r.inTime + (r.outTime ? ' - ' + r.outTime : ' - ...') : r?.source === 'manual' ? 'Admin ne mark kiya' : '--'}
                                    </Text>
                                    {r?.inOutside ? <Subtle style={{ color: colors.destructive }}>Campus ke bahar se ({r.inDistance} m)</Subtle> : null}
                                </View>
                                <Badge tone={st[1]}>{st[0]}</Badge>
                            </Card>
                        );
                    }}
                />
            )}
        </View>
    );
}
