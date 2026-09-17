import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../lib/api';
import { useStudents } from '../context/StudentContext';
import { useTheme } from '../context/ThemeContext';
import { ChildSwitcher } from '../components/ChildSwitcher';
import { Card, Title, Subtle, Badge, Loader, Row } from '../components/ui';

const fmt = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const gradeTone = (g) => {
    if (!g) return 'muted';
    if (['A1', 'A2'].includes(g)) return 'success';
    if (g === 'E') return 'danger';
    return 'info';
};

const resultTone = (r) => (r === 'pass' ? 'success' : r === 'fail' ? 'danger' : 'muted');

export default function ResultsScreen() {
    const { active, loading: studentsLoading } = useStudents();
    const { colors, radius } = useTheme();

    const [exams, setExams] = useState([]);
    const [examId, setExamId] = useState(null);
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(true);

    const loadExams = useCallback(async () => {
        if (!active) {
            setExams([]);
            setResult(null);
            setBusy(false);
            return;
        }
        setBusy(true);
        try {
            const { data } = await api.get('/portal/students/' + active.id + '/exams');
            setExams(data.data);
            // Pehla (sabse naya) exam apne aap khul jaye
            setExamId(data.data[0]?.id ?? null);
        } catch {
            setExams([]);
        } finally {
            setBusy(false);
        }
    }, [active]);

    useEffect(() => {
        loadExams();
    }, [loadExams]);

    useEffect(() => {
        if (!active || !examId) {
            setResult(null);
            return;
        }
        api.get('/portal/students/' + active.id + '/exams/' + examId + '/result')
            .then(({ data }) => setResult(data.data))
            .catch(() => setResult(null));
    }, [active, examId]);

    if (studentsLoading) return <Loader />;

    const s = result?.summary;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <View style={{ padding: 16, paddingBottom: 12 }}>
                <Title>Results</Title>
                <Subtle style={{ marginTop: 2 }}>Sirf publish kiye gaye results dikhte hain</Subtle>
            </View>

            <ChildSwitcher />

            <ScrollView
                contentContainerStyle={{ padding: 16, gap: 14 }}
                refreshControl={
                    <RefreshControl refreshing={busy} onRefresh={loadExams} tintColor={colors.primary} />
                }
            >
                {exams.length === 0 ? (
                    <Card>
                        <Subtle>Abhi koi result publish nahi hua</Subtle>
                    </Card>
                ) : (
                    <>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {exams.map((e) => {
                                    const on = e.id === examId;
                                    return (
                                        <TouchableOpacity
                                            key={e.id}
                                            onPress={() => setExamId(e.id)}
                                            activeOpacity={0.8}
                                            style={{
                                                paddingHorizontal: 14,
                                                paddingVertical: 9,
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
                                                {e.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        {!result ? (
                            <Card>
                                <Subtle>Result load ho raha hai...</Subtle>
                            </Card>
                        ) : (
                            <>
                                <Card>
                                    <View style={{ alignItems: 'center', gap: 8 }}>
                                        <Subtle>{result.exam.name}</Subtle>
                                        <Text style={{ fontSize: 34, fontWeight: '700', color: colors.foreground }}>
                                            {s.percent != null ? s.percent + '%' : '-'}
                                        </Text>
                                        <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
                                            {s.totalObtained} / {s.totalMax} marks
                                        </Text>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <Badge tone={gradeTone(s.grade)}>Grade {s.grade || '-'}</Badge>
                                            <Badge tone={resultTone(s.result)}>
                                                {s.result === 'incomplete' ? 'Incomplete' : s.result.toUpperCase()}
                                            </Badge>
                                        </View>
                                        <Subtle>
                                            {fmt(result.exam.startDate)} - {fmt(result.exam.endDate)}
                                        </Subtle>
                                    </View>
                                </Card>

                                <Card>
                                    <Subtle style={{ marginBottom: 6, fontWeight: '600' }}>SUBJECT WISE</Subtle>
                                    {result.subjects.map((sub) => (
                                        <Row
                                            key={sub.examSubjectId}
                                            label={sub.subject}
                                            value={
                                                sub.isAbsent
                                                    ? 'Absent'
                                                    : sub.marksObtained == null
                                                      ? 'Pending'
                                                      : sub.marksObtained + ' / ' + sub.maxMarks + '  ' + (sub.grade || '')
                                            }
                                        />
                                    ))}
                                </Card>
                            </>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
