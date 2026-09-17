import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useStudents } from '../context/StudentContext';
import { useTheme } from '../context/ThemeContext';
import { ChildSwitcher } from '../components/ChildSwitcher';
import { Card, Title, Subtle, Badge, Loader, ErrorState, Avatar, Body } from '../components/ui';

function Stat({ label, value }) {
    const { colors, radius } = useTheme();
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
                padding: 14,
                gap: 2,
            }}
        >
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{label}</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground }}>{value}</Text>
        </View>
    );
}

export default function HomeScreen() {
    const { user } = useAuth();
    const { active, school, loading, error, reload } = useStudents();
    const { colors } = useTheme();

    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [busy, setBusy] = useState(false);

    const loadDetails = useCallback(async () => {
        if (!active) return;
        setBusy(true);
        try {
            const [s, t] = await Promise.all([
                api.get('/portal/students/' + active.id + '/subjects'),
                api.get('/portal/students/' + active.id + '/teachers'),
            ]);
            setSubjects(s.data.data);
            setTeachers(t.data.data);
        } catch {
            setSubjects([]);
            setTeachers([]);
        } finally {
            setBusy(false);
        }
    }, [active]);

    useEffect(() => {
        loadDetails();
    }, [loadDetails]);

    if (loading) return <Loader text="Load ho raha hai..." />;
    if (error) return <ErrorState message={error} onRetry={reload} />;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <View style={{ padding: 16, paddingBottom: 12 }}>
                <Subtle>{school?.name}</Subtle>
                <Title style={{ marginTop: 2 }}>Namaste, {user?.name?.split(' ')[0]}</Title>
            </View>

            <ChildSwitcher />

            <ScrollView
                contentContainerStyle={{ padding: 16, gap: 14 }}
                refreshControl={
                    <RefreshControl
                        refreshing={busy}
                        onRefresh={() => {
                            reload();
                            loadDetails();
                        }}
                        tintColor={colors.primary}
                    />
                }
            >
                {!active ? (
                    <Card>
                        <Body>Aapke account se abhi koi student juda hua nahi hai.</Body>
                        <Subtle style={{ marginTop: 6 }}>
                            School office se sampark kijiye taki aapka account bachche se link ho sake.
                        </Subtle>
                    </Card>
                ) : (
                    <>
                        <Card>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                                <Avatar name={active.name} size={52} />
                                <View style={{ flex: 1, gap: 4 }}>
                                    <Text style={{ fontSize: 17, fontWeight: '600', color: colors.foreground }}>
                                        {active.name}
                                    </Text>
                                    <Subtle>{active.admissionNo}</Subtle>
                                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                                        <Badge>
                                            {active.className || 'Unassigned'}
                                            {active.sectionName ? ' - ' + active.sectionName : ''}
                                        </Badge>
                                        {active.rollNo ? <Badge tone="muted">Roll {active.rollNo}</Badge> : null}
                                    </View>
                                </View>
                            </View>
                        </Card>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Stat label="Subjects" value={subjects.length} />
                            <Stat label="Teachers" value={teachers.length} />
                            <Stat label="Blood group" value={active.bloodGroup || '-'} />
                        </View>

                        <Card>
                            <Text
                                style={{
                                    fontSize: 15,
                                    fontWeight: '600',
                                    color: colors.foreground,
                                    marginBottom: 10,
                                }}
                            >
                                Aapke teachers
                            </Text>
                            {teachers.length === 0 ? (
                                <Subtle>Abhi koi teacher assign nahi hua</Subtle>
                            ) : (
                                teachers.map((t, i) => (
                                    <View
                                        key={String(t.id) + '-' + i}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 12,
                                            paddingVertical: 10,
                                            borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                                            borderTopColor: colors.border,
                                        }}
                                    >
                                        <Avatar name={t.name} size={38} />
                                        <View style={{ flex: 1 }}>
                                            <Text
                                                style={{ fontSize: 14, fontWeight: '500', color: colors.foreground }}
                                            >
                                                {t.name}
                                            </Text>
                                            <Subtle>{t.role}</Subtle>
                                        </View>
                                        <Subtle>{t.phone || ''}</Subtle>
                                    </View>
                                ))
                            )}
                        </Card>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
