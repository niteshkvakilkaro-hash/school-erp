import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Card, Title, Subtle, Row, Button, Avatar, Badge, Loader } from '../components/ui';

export default function SchoolScreen() {
    const { user, school: sessionSchool, logout } = useAuth();
    const { colors } = useTheme();

    const [school, setSchool] = useState(null);
    const [busy, setBusy] = useState(true);

    const load = useCallback(async () => {
        setBusy(true);
        try {
            const { data } = await api.get('/portal/school');
            setSchool(data.data);
        } catch {
            setSchool(null);
        } finally {
            setBusy(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const confirmLogout = () => {
        Alert.alert('Logout', 'Kya aap logout karna chahte hain?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout },
        ]);
    };

    if (busy && !school) return <Loader />;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <View style={{ padding: 16, paddingBottom: 12 }}>
                <Title>School and account</Title>
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 16, gap: 14 }}
                refreshControl={
                    <RefreshControl refreshing={busy} onRefresh={load} tintColor={colors.primary} />
                }
            >
                <Card>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <Avatar name={user?.name} size={52} />
                        <View style={{ flex: 1, gap: 4 }}>
                            <Title style={{ fontSize: 17 }}>{user?.name}</Title>
                            <Subtle>{user?.email}</Subtle>
                            <Badge tone="muted">{user?.role?.name}</Badge>
                        </View>
                    </View>
                </Card>

                <Card>
                    <Subtle style={{ marginBottom: 6, fontWeight: '600' }}>SCHOOL</Subtle>
                    <Row label="Name" value={school?.name || sessionSchool?.name} />
                    <Row label="Code" value={school?.code || sessionSchool?.code} />
                    <Row label="Session" value={school?.session || sessionSchool?.session} />
                    <Row label="Phone" value={school?.phone} />
                    <Row label="Email" value={school?.email} />
                    <Row label="Website" value={school?.website} />
                </Card>

                <Card>
                    <Subtle style={{ marginBottom: 6, fontWeight: '600' }}>ADDRESS</Subtle>
                    <Row label="Address" value={school?.address} />
                    <Row label="City" value={school?.city} />
                    <Row label="State" value={school?.state} />
                </Card>

                <Button title="Logout" variant="outline" onPress={confirmLogout} />
            </ScrollView>
        </SafeAreaView>
    );
}
