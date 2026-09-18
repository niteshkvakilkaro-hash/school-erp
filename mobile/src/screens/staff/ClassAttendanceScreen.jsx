import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { Card, Title, Subtle, Button, Loader } from '../../components/ui';

const OPTIONS = [
    ['present', 'P'],
    ['absent', 'A'],
    ['leave', 'L'],
    ['half-day', 'H'],
];

const today = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

/** Teacher apni class ki aaj ki attendance lagata hai (web panel wala hi API). */
export default function ClassAttendanceScreen({ route }) {
    const { colors, radius } = useTheme();
    const [sections, setSections] = useState(null);
    const [pick, setPick] = useState(null);
    const [roster, setRoster] = useState(null);
    const [marks, setMarks] = useState({});
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);

    // Home se "Attendance" dabane par wahi section khule
    useEffect(() => {
        const p = route.params;
        if (p?.classId) setPick({ classId: p.classId, sectionId: p.sectionId, label: p.label });
    }, [route.params]);

    useEffect(() => {
        api.get('/hr/me')
            .then(({ data }) => setSections(data.data.sections))
            .catch(() => setSections([]));
    }, []);

    const load = useCallback(async () => {
        if (!pick) return;
        setRoster(null);
        try {
            const { data } = await api.get('/attendance/roster', { params: { classId: pick.classId, sectionId: pick.sectionId, date: today() } });
            setRoster(data.data);
            setMarks(Object.fromEntries(data.data.rows.map((r) => [r.studentId, r.status || 'present'])));
        } catch (e) {
            setMsg(e.response?.data?.message || e.message);
        }
    }, [pick]);

    // Class badalne par purana message hatao; save ke baad reload me message rehna chahiye
    useEffect(() => {
        setMsg(null);
        load();
    }, [load]);

    const save = async () => {
        setBusy(true);
        setMsg(null);
        try {
            const entries = roster.rows.map((r) => ({ studentId: r.studentId, status: marks[r.studentId] }));
            const { data } = await api.post('/attendance/bulk', { classId: pick.classId, sectionId: pick.sectionId, date: today(), entries });
            setMsg('✅ ' + data.message);
            load();
        } catch (e) {
            const m = e.response?.data?.message || e.message;
            setMsg(m);
            Alert.alert('Save nahi hua', m);
        } finally {
            setBusy(false);
        }
    };

    if (!pick) {
        if (sections === null) return <Loader />;
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
                <View style={{ padding: 16, gap: 12 }}>
                    <Title>Class attendance</Title>
                    <Subtle>Class chuniye</Subtle>
                    {sections.length ? (
                        sections.map((s) => (
                            <TouchableOpacity key={s.id} onPress={() => setPick({ classId: s.classId, sectionId: s.id, label: s.className + ' ' + s.name })}>
                                <Card>
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>
                                        {s.className} - {s.name}
                                    </Text>
                                    <Subtle>Aap class teacher hain</Subtle>
                                </Card>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <Card>
                            <Subtle>Aap kisi section ke class teacher nahi hain. Doosri class ki attendance web panel se lagaiye.</Subtle>
                        </Card>
                    )}
                </View>
            </SafeAreaView>
        );
    }

    const counts = { present: 0, absent: 0, leave: 0, 'half-day': 0 };
    Object.values(marks).forEach((s) => (counts[s] = (counts[s] || 0) + 1));

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <View style={{ padding: 16, paddingBottom: 8, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title>{pick.label}</Title>
                    {sections?.length > 1 ? (
                        <TouchableOpacity onPress={() => setPick(null)}>
                            <Text style={{ color: colors.primary, fontWeight: '600' }}>Badliye</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
                <Subtle>
                    Aaj - {counts.present} P, {counts.absent} A, {counts.leave} L, {counts['half-day']} H
                    {roster?.alreadyMarked ? '  |  pehle lag chuki (' + (roster.markedBy || '') + ')' : ''}
                </Subtle>
                {msg ? <Text style={{ color: msg.startsWith('✅') ? colors.success : colors.destructive, marginTop: 4 }}>{msg}</Text> : null}
            </View>

            {!roster ? (
                <Loader />
            ) : (
                <FlatList
                    data={roster.rows}
                    keyExtractor={(r) => String(r.studentId)}
                    contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 8, paddingBottom: 140 }}
                    ListHeaderComponent={
                        <TouchableOpacity onPress={() => setMarks(Object.fromEntries(roster.rows.map((r) => [r.studentId, 'present'])))} style={{ alignSelf: 'flex-end', paddingVertical: 6 }}>
                            <Text style={{ color: colors.primary, fontWeight: '600' }}>Sab present</Text>
                        </TouchableOpacity>
                    }
                    renderItem={({ item }) => (
                        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}>{item.name}</Text>
                                <Subtle>Roll {item.rollNo || '-'}</Subtle>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                {OPTIONS.map(([k, l]) => {
                                    const on = marks[item.studentId] === k;
                                    const tone = k === 'present' ? colors.success : k === 'absent' ? colors.destructive : colors.warning;
                                    return (
                                        <TouchableOpacity
                                            key={k}
                                            accessibilityLabel={item.name + ' ' + k}
                                            onPress={() => setMarks((m) => ({ ...m, [item.studentId]: k }))}
                                            style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: radius.md,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: on ? tone : colors.muted,
                                            }}
                                        >
                                            <Text style={{ fontWeight: '700', color: on ? '#fff' : colors.mutedForeground }}>{l}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </Card>
                    )}
                />
            )}
            {roster ? (
                <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
                    <Button title={'Save attendance (' + roster.rows.length + ')'} onPress={save} loading={busy} />
                </View>
            ) : null}
        </SafeAreaView>
    );
}
