import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Card, Title, Subtle, Avatar, Badge, Button } from '../components/ui';

const ITEMS = [
    { key: 'Results', icon: '📊', label: 'Results', sub: 'Exam ke marks aur grades' },
    { key: 'Timetable', icon: '📅', label: 'Timetable', sub: 'Din ke hisaab se classes' },
    { key: 'Homework', icon: '📝', label: 'Homework', sub: 'Pending aur overdue assignments' },
    { key: 'Library', icon: '📚', label: 'Library', sub: 'Issued books, due date aur fine' },
    { key: 'Transport', icon: '\u{1F68C}', label: 'Transport', sub: 'Bus, stop timing aur driver ka number' },
    { key: 'Profile', icon: '\u{1F464}', label: 'Student profile', sub: 'Poori details aur guardian info' },
    { key: 'Subjects', icon: '\u{1F4DA}', label: 'Subjects', sub: 'Class ke subjects aur teachers' },
    { key: 'School', icon: '\u{1F3EB}', label: 'School info', sub: 'Address, contact aur session' },
];

/** "More" tab ka menu - kam use hone wale screens yahan se khulte hain. */
export default function MoreScreen({ navigation }) {
    const { user, school, logout } = useAuth();
    const { colors, radius } = useTheme();

    const confirmLogout = () => {
        Alert.alert('Logout', 'Kya aap logout karna chahte hain?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout },
        ]);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <View style={{ padding: 16, paddingBottom: 12 }}>
                <Title>More</Title>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
                <Card>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <Avatar name={user?.name} size={52} />
                        <View style={{ flex: 1, gap: 4 }}>
                            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.foreground }}>
                                {user?.name}
                            </Text>
                            <Subtle>{user?.email}</Subtle>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                <Badge tone="muted">{user?.role?.name}</Badge>
                                {school ? <Badge tone="info">{school.code}</Badge> : null}
                            </View>
                        </View>
                    </View>
                </Card>

                <Card style={{ padding: 0, overflow: 'hidden' }}>
                    {ITEMS.map((item, i) => (
                        <TouchableOpacity
                            key={item.key}
                            activeOpacity={0.7}
                            onPress={() => navigation.navigate(item.key)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 14,
                                padding: 16,
                                borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                                borderTopColor: colors.border,
                            }}
                        >
                            <View
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: radius.md,
                                    backgroundColor: colors.accent,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 15, fontWeight: '500', color: colors.foreground }}>
                                    {item.label}
                                </Text>
                                <Subtle>{item.sub}</Subtle>
                            </View>
                            <Text style={{ color: colors.mutedForeground, fontSize: 18 }}>›</Text>
                        </TouchableOpacity>
                    ))}
                </Card>

                <Button title="Logout" variant="outline" onPress={confirmLogout} />
            </ScrollView>
        </SafeAreaView>
    );
}
