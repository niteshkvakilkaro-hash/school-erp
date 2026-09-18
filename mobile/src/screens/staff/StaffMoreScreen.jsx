import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Card, Title, Subtle, Avatar, Button } from '../../components/ui';

export default function StaffMoreScreen({ navigation }) {
    const { user, school, logout, can } = useAuth();
    const { colors } = useTheme();

    const items = [
        { key: 'MyAttendance', icon: '\u{1F4C5}', label: 'Meri attendance', sub: 'Mahine bhar ka hisaab' },
        can('timetable.view') ? { key: 'StaffTimetable', icon: '\u{1F552}', label: 'Mera timetable', sub: 'Hafte ke periods' } : null,
    ].filter(Boolean);

    const confirmLogout = () => {
        // Web par Alert ke buttons nahi chalte
        if (typeof window !== 'undefined' && window.confirm) {
            if (window.confirm('Logout karna hai?')) logout();
            return;
        }
        Alert.alert('Logout', 'Kya aap logout karna chahte hain?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout },
        ]);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Avatar name={user?.name || 'S'} size={52} />
                    <View style={{ flex: 1 }}>
                        <Title style={{ fontSize: 18 }}>{user?.name}</Title>
                        <Subtle>{user?.role?.name}</Subtle>
                        <Subtle>{school?.name}</Subtle>
                    </View>
                </Card>
                {items.map((it) => (
                    <TouchableOpacity key={it.key} onPress={() => navigation.navigate(it.key)}>
                        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Text style={{ fontSize: 22 }}>{it.icon}</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}>{it.label}</Text>
                                <Subtle>{it.sub}</Subtle>
                            </View>
                            <Text style={{ color: colors.mutedForeground, fontSize: 18 }}>{'›'}</Text>
                        </Card>
                    </TouchableOpacity>
                ))}
                <Button title="Logout" variant="outline" onPress={confirmLogout} style={{ marginTop: 8 }} />
            </ScrollView>
        </SafeAreaView>
    );
}
