import { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button, Input, Title, Subtle, Card } from '../components/ui';
import { ServerSetting } from '../components/ServerSetting';

export default function LoginScreen() {
    const { login } = useAuth();
    const { colors, radius } = useTheme();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [schoolChoices, setSchoolChoices] = useState(null);

    const attempt = async (schoolCode) => {
        if (!email.trim() || !password) {
            setError('Email aur password dono bhariye');
            return;
        }
        setError('');
        setBusy(true);
        try {
            await login(email.trim(), password, schoolCode);
        } catch (err) {
            if (err.needsSchoolChoice) setSchoolChoices(err.schools);
            else setError(err.message || 'Login nahi ho paaya');
        } finally {
            setBusy(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.sidebar }} edges={['top']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                    <View style={{ paddingHorizontal: 24, paddingTop: 48, paddingBottom: 40 }}>
                        <View
                            style={{
                                width: 56,
                                height: 56,
                                borderRadius: radius.xl,
                                backgroundColor: colors.primary,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 20,
                            }}
                        >
                            <Text style={{ fontSize: 26 }}>GS</Text>
                        </View>
                        <Text style={{ fontSize: 26, fontWeight: '700', color: '#ffffff' }}>
                            ERPSC School
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.sidebarForeground, marginTop: 6 }}>
                            Parent aur student portal
                        </Text>
                    </View>

                    <View
                        style={{
                            flex: 1,
                            backgroundColor: colors.background,
                            borderTopLeftRadius: 28,
                            borderTopRightRadius: 28,
                            padding: 24,
                            gap: 16,
                        }}
                    >
                        {schoolChoices ? (
                            <>
                                <TouchableOpacity onPress={() => setSchoolChoices(null)}>
                                    <Subtle>Wapas</Subtle>
                                </TouchableOpacity>
                                <Title>Apna school chuniye</Title>
                                <Subtle>Ye email ek se zyada school me registered hai</Subtle>

                                {schoolChoices.map((s) => (
                                    <TouchableOpacity
                                        key={s.id}
                                        disabled={busy}
                                        onPress={() => attempt(s.code)}
                                        activeOpacity={0.8}
                                    >
                                        <Card>
                                            <Text
                                                style={{
                                                    fontSize: 15,
                                                    fontWeight: '600',
                                                    color: colors.foreground,
                                                }}
                                            >
                                                {s.name}
                                            </Text>
                                            <Subtle style={{ marginTop: 2 }}>{s.code}</Subtle>
                                        </Card>
                                    </TouchableOpacity>
                                ))}
                            </>
                        ) : (
                            <>
                                <Title>Welcome back</Title>
                                <Subtle>Apne account se login kijiye</Subtle>

                                {error ? (
                                    <View
                                        style={{
                                            backgroundColor: colors.destructive + '1A',
                                            borderRadius: radius.md,
                                            borderWidth: StyleSheet.hairlineWidth,
                                            borderColor: colors.destructive + '55',
                                            padding: 12,
                                        }}
                                    >
                                        <Text style={{ color: colors.destructive, fontSize: 13 }}>
                                            {error}
                                        </Text>
                                    </View>
                                ) : null}

                                <Input
                                    label="Email"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    placeholder="parent@sunrise.com"
                                    autoComplete="email"
                                />
                                <Input
                                    label="Password"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    placeholder="Password"
                                    onSubmitEditing={() => attempt()}
                                />

                                <Button title="Sign in" loading={busy} onPress={() => attempt()} />

                                <Card style={{ backgroundColor: colors.muted, marginTop: 8 }}>
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            fontWeight: '600',
                                            color: colors.foreground,
                                            marginBottom: 6,
                                        }}
                                    >
                                        Demo accounts
                                    </Text>
                                    <Subtle>Parent: parent@sunrise.com / parent123</Subtle>
                                    <Subtle>Student: student@sunrise.com / student123</Subtle>
                                    <Subtle>Teacher: anita.sharma@sunrise.com / teacher123</Subtle>
                                    <ServerSetting />
                                </Card>
                            </>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
