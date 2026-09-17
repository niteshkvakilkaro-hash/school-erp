import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../lib/api';
import { useStudents } from '../context/StudentContext';
import { useTheme } from '../context/ThemeContext';
import { ChildSwitcher } from '../components/ChildSwitcher';
import { Card, Title, Subtle, Row, Loader, Avatar, Badge } from '../components/ui';

const fmt = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '-');

export default function ProfileScreen() {
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
            const res = await api.get('/portal/students/' + active.id);
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
                <Title>Student profile</Title>
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
                        <Subtle>Koi record nahi mila</Subtle>
                    </Card>
                ) : (
                    <>
                        <Card>
                            <View style={{ alignItems: 'center', gap: 10 }}>
                                <Avatar name={data.name} size={72} />
                                <Title>{data.name}</Title>
                                <Subtle>{data.admissionNo}</Subtle>
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                    <Badge>
                                        {data.schoolClass?.name || 'Unassigned'}
                                        {data.section ? ' - ' + data.section.name : ''}
                                    </Badge>
                                    <Badge tone={data.status === 'active' ? 'default' : 'muted'}>
                                        {cap(data.status)}
                                    </Badge>
                                </View>
                            </View>
                        </Card>

                        <Card>
                            <Subtle style={{ marginBottom: 6, fontWeight: '600' }}>PERSONAL</Subtle>
                            <Row label="Roll number" value={data.rollNo} />
                            <Row label="Gender" value={cap(data.gender)} />
                            <Row label="Date of birth" value={fmt(data.dob)} />
                            <Row label="Blood group" value={data.bloodGroup} />
                            <Row label="Admission date" value={fmt(data.admissionDate)} />
                        </Card>

                        <Card>
                            <Subtle style={{ marginBottom: 6, fontWeight: '600' }}>GUARDIAN</Subtle>
                            <Row label="Father" value={data.fatherName} />
                            <Row label="Mother" value={data.motherName} />
                            <Row label="Phone" value={data.guardianPhone} />
                        </Card>

                        <Card>
                            <Subtle style={{ marginBottom: 6, fontWeight: '600' }}>ADDRESS</Subtle>
                            <Row label="Address" value={data.address} />
                            <Row label="City" value={data.city} />
                            <Row label="Room" value={data.section?.roomNo} />
                        </Card>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
