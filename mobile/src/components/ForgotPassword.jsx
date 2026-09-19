import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import api from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { Button, Input, Title, Subtle, Card } from './ui';

/**
 * Password bhool gaye: email -> registered mobile par OTP -> OTP + naya password.
 * Login screen ke andar hi chalta hai.
 */
export function ForgotPassword({ initialEmail = '', onBack, onDone }) {
    const { colors, radius } = useTheme();
    const [step, setStep] = useState('email'); // email | school | otp
    const [email, setEmail] = useState(initialEmail);
    const [schoolCode, setSchoolCode] = useState('');
    const [schools, setSchools] = useState([]);
    const [sent, setSent] = useState(null);
    const [otp, setOtp] = useState('');
    const [pwd, setPwd] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [wait, setWait] = useState(0);

    useEffect(() => {
        if (wait <= 0) return undefined;
        const t = setTimeout(() => setWait((w) => w - 1), 1000);
        return () => clearTimeout(t);
    }, [wait]);

    const requestOtp = async (code = schoolCode) => {
        if (!email.trim()) return setError('Email daaliye');
        setBusy(true);
        setError('');
        try {
            const body = { email: email.trim() };
            if (code) body.schoolCode = code;
            const { data } = await api.post('/auth/forgot-password', body);
            setSent(data.data);
            setOtp('');
            setStep('otp');
            setWait(30);
        } catch (err) {
            if (err.needsSchoolChoice) {
                const res = await api.get('/auth/schools').catch(() => null);
                setSchools(res?.data?.data || []);
                setStep('school');
            } else setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const reset = async () => {
        if (otp.length !== 6) return setError('6 digit OTP daaliye');
        if (pwd.length < 6) return setError('Password kam se kam 6 character ka ho');
        if (pwd !== confirm) return setError('Dono password same hone chahiye');
        setBusy(true);
        setError('');
        try {
            await api.post('/auth/forgot-password/reset', { ref: sent.ref, otp, newPassword: pwd });
            onDone(email.trim());
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <TouchableOpacity onPress={step === 'email' ? onBack : () => { setStep('email'); setError(''); }} accessibilityRole="button">
                <Subtle>Wapas</Subtle>
            </TouchableOpacity>
            <Title>{step === 'school' ? 'Apna school chuniye' : 'Password bhool gaye?'}</Title>
            <Subtle>
                {step === 'email' && 'Apna login email daaliye - registered mobile par OTP aayega'}
                {step === 'school' && 'Ye email ek se zyada school me hai'}
                {step === 'otp' && 'OTP ' + (sent?.phoneHint || '') + ' par bheja gaya (10 minute valid)'}
            </Subtle>

            {error ? (
                <View style={{ backgroundColor: colors.destructive + '1A', borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.destructive + '55', padding: 12 }}>
                    <Text style={{ color: colors.destructive, fontSize: 13 }}>{error}</Text>
                </View>
            ) : null}

            {step === 'email' ? (
                <>
                    <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="parent@sunrise.com" />
                    <Button title="OTP bhejiye" loading={busy} onPress={() => { setSchoolCode(''); requestOtp(''); }} />
                </>
            ) : null}

            {step === 'school'
                ? schools.map((s) => (
                      <TouchableOpacity key={s.id} disabled={busy} activeOpacity={0.8} onPress={() => { setSchoolCode(s.code); requestOtp(s.code); }}>
                          <Card>
                              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}>{s.name}</Text>
                              <Subtle style={{ marginTop: 2 }}>{s.code}</Subtle>
                          </Card>
                      </TouchableOpacity>
                  ))
                : null}

            {step === 'otp' ? (
                <>
                    {sent?.demoOtp ? (
                        <View style={{ backgroundColor: '#fef3c7', borderRadius: radius.md, padding: 12 }}>
                            <Text style={{ color: '#92400e', fontSize: 13 }}>
                                Demo mode (asli SMS nahi gaya) - OTP: <Text style={{ fontWeight: '700', letterSpacing: 2 }}>{sent.demoOtp}</Text>
                            </Text>
                        </View>
                    ) : null}
                    <Input label="OTP" value={otp} onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} placeholder="6 digit" textContentType="oneTimeCode" autoComplete="sms-otp" />
                    <Input label="Naya password" value={pwd} onChangeText={setPwd} secureTextEntry placeholder="Kam se kam 6 character" />
                    <Input label="Password dobara" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Wahi password" onSubmitEditing={reset} />
                    <Button title="Password badliye" loading={busy} onPress={reset} />
                    <TouchableOpacity disabled={wait > 0 || busy} onPress={() => requestOtp()} style={{ alignItems: 'center' }}>
                        <Text style={{ color: wait > 0 ? colors.mutedForeground : colors.primary, fontWeight: '600' }}>
                            {wait > 0 ? 'Dobara bhejiye (' + wait + 's)' : 'OTP dobara bhejiye'}
                        </Text>
                    </TouchableOpacity>
                </>
            ) : null}
        </>
    );
}
