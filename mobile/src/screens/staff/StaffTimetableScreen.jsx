import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import api from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { Card, Subtle, Loader, ErrorState } from '../../components/ui';

/** Teacher ka hafte bhar ka timetable - din chuniye. */
export default function StaffTimetableScreen() {
    const { colors, radius } = useTheme();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [day, setDay] = useState(Math.min(Math.max(new Date().getDay(), 1), 6));

    useEffect(() => {
        api.get('/timetable/teacher')
            .then(({ data: res }) => setData(res.data))
            .catch((e) => setError(e.response?.data?.message || e.message));
    }, []);

    if (error) return <ErrorState message={error} />;
    if (!data) return <Loader />;
    const periods = data.periods.filter((p) => p.cells[day]);

    return (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
                {data.days.map((d) => (
                    <TouchableOpacity
                        key={d.value}
                        onPress={() => setDay(d.value)}
                        style={{ flex: 1, paddingVertical: 8, borderRadius: radius.md, alignItems: 'center', backgroundColor: day === d.value ? colors.primary : colors.muted }}
                    >
                        <Text style={{ fontWeight: '600', fontSize: 12, color: day === d.value ? colors.primaryForeground : colors.mutedForeground }}>
                            {String(d.label).slice(0, 3)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Subtle>
                {periods.length} periods - hafte me kul {data.totalPeriods}
            </Subtle>
            {periods.map((p) => (
                <Card key={p.id} style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ width: 70 }}>
                        <Text style={{ fontWeight: '600', color: colors.foreground }}>{p.startTime?.slice(0, 5)}</Text>
                        <Subtle style={{ fontSize: 12 }}>{p.endTime?.slice(0, 5)}</Subtle>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '600', fontSize: 15, color: colors.foreground }}>{p.cells[day].subject || p.name}</Text>
                        <Subtle>
                            {p.cells[day].className} {p.cells[day].sectionName || ''}
                            {p.cells[day].roomNo ? ' - Room ' + p.cells[day].roomNo : ''}
                        </Subtle>
                    </View>
                </Card>
            ))}
            {!periods.length ? (
                <Card>
                    <Subtle>Is din koi period nahi</Subtle>
                </Card>
            ) : null}
        </ScrollView>
    );
}
