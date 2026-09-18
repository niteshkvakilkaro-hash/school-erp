import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { API_URL, DEFAULT_API, setServer } from '../lib/api';
import { Button, Input, Subtle } from './ui';

/**
 * Login screen par - app kis server se jude. APK ek hi baar banti hai, server
 * ka link (demo tunnel / asli domain) yahan se badla ja sakta hai.
 */
export function ServerSetting() {
    const { colors } = useTheme();
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [current, setCurrent] = useState(API_URL);

    const save = async (input) => {
        setBusy(true);
        setError('');
        try {
            const url = await setServer(input);
            setCurrent(url);
            setOpen(false);
            setValue('');
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const shown = current.replace(/\/api$/, '');
    if (!open) {
        return (
            <TouchableOpacity onPress={() => setOpen(true)} style={{ marginTop: 8 }} accessibilityLabel="Server badliye">
                <Subtle style={{ fontSize: 11 }}>
                    Server: {shown} <Text style={{ color: colors.primary, fontWeight: '600' }}> Badliye</Text>
                </Subtle>
            </TouchableOpacity>
        );
    }
    return (
        <View style={{ marginTop: 10, gap: 8 }}>
            <Input
                label="Server ka link"
                placeholder="https://xyz.trycloudflare.com"
                value={value}
                onChangeText={setValue}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                error={error}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button title="Cancel" variant="outline" onPress={() => setOpen(false)} style={{ flex: 1 }} />
                <Button title="Jodiye" onPress={() => save(value)} loading={busy} disabled={!value.trim()} style={{ flex: 1 }} />
            </View>
            {current !== DEFAULT_API ? (
                <TouchableOpacity onPress={() => save(null)}>
                    <Subtle style={{ fontSize: 11, textAlign: 'center' }}>Default par wapas ({DEFAULT_API.replace(/\/api$/, '')})</Subtle>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}
