import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Platform, ScrollView, Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import api from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { Card, Subtle, Button, Badge } from '../../components/ui';

/** Do GPS points ke beech meter - sirf dikhane ke liye, asli hisaab server karta hai. */
function distanceM(a, b) {
    const R = 6371000;
    const rad = (x) => (x * Math.PI) / 180;
    const dLat = rad(b.latitude - a.latitude);
    const dLng = rad(b.longitude - a.longitude);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

async function fileFrom(photo) {
    if (Platform.OS === 'web') {
        // Web par camera data-URL deta hai - bina fetch ke Blob banao (strict CSP me fetch(data:) blocked hota hai)
        if (photo.uri.startsWith('data:')) {
            const [meta, b64] = photo.uri.split(',');
            const type = (meta.match(/^data:([^;]+)/) || [])[1] || 'image/jpeg';
            const bin = atob(b64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            return [new Blob([bytes], { type }), type === 'image/png' ? 'selfie.png' : 'selfie.jpg'];
        }
        const blob = await (await fetch(photo.uri)).blob();
        return [blob, 'selfie.jpg'];
    }
    return [{ uri: photo.uri, name: 'selfie.jpg', type: 'image/jpeg' }];
}

/**
 * Selfie + location ke saath check-in / check-out. Time server ka lagta hai,
 * isliye phone ki ghadi badalne se kuch nahi hota.
 */
export default function CheckInScreen({ route, navigation }) {
    const { mode = 'in', policy } = route.params || {};
    const isIn = mode === 'in';
    const selfieNeeded = isIn && policy?.requireSelfie !== false;
    const { colors, radius } = useTheme();
    const camRef = useRef(null);
    const [camPerm, requestCam] = useCameraPermissions();
    const [loc, setLoc] = useState(null);
    const [locError, setLocError] = useState(null);
    const [photo, setPhoto] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [ready, setReady] = useState(false);

    const getLocation = async () => {
        setLocError(null);
        setLoc(null);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocError('Location ki permission nahi mili - settings me allow kijiye');
                return;
            }
            const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            setLoc({ ...p.coords, mocked: Boolean(p.mocked) });
        } catch (e) {
            setLocError('GPS se location nahi mili: ' + (e.message || 'phone me location on kijiye'));
        }
    };

    useEffect(() => {
        getLocation();
        if (!camPerm?.granted) requestCam();
        // sirf pehli baar
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const dist = loc && policy?.school ? distanceM(loc, policy.school) : null;
    const outside = dist !== null && dist - Math.min(loc?.accuracy || 0, 100) > (policy?.radiusM || 200);

    const capture = async () => {
        try {
            const p = await camRef.current?.takePictureAsync({ quality: 0.6 });
            if (p) setPhoto(p);
        } catch (e) {
            setError('Photo nahi khinchi: ' + e.message);
        }
    };

    const submit = async () => {
        setBusy(true);
        setError(null);
        try {
            const fd = new FormData();
            if (loc) {
                fd.append('latitude', String(loc.latitude));
                fd.append('longitude', String(loc.longitude));
                fd.append('accuracy', String(Math.round(loc.accuracy || 0)));
                if (loc.mocked) fd.append('mocked', 'true');
            }
            if (photo) fd.append('file', ...(await fileFrom(photo)));
            const { data } = await api.post('/hr/me/check-' + mode, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            navigation.navigate('StaffTabs', { screen: 'Home', params: { flash: data.message, at: Date.now() } });
        } catch (e) {
            setError(e.response?.data?.message || e.message);
        } finally {
            setBusy(false);
        }
    };

    const canSubmit = (!selfieNeeded || photo) && (loc || policy?.requireLocation === false) && !busy;

    return (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 14 }}>
            {/* Camera / photo */}
            <View style={{ borderRadius: radius.xl, overflow: 'hidden', backgroundColor: '#000', aspectRatio: 3 / 4 }}>
                {photo ? (
                    <Image source={{ uri: photo.uri }} style={{ flex: 1 }} resizeMode="cover" />
                ) : camPerm?.granted ? (
                    <CameraView ref={camRef} style={{ flex: 1 }} facing="front" onCameraReady={() => setReady(true)} />
                ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
                        <Text style={{ color: '#fff', textAlign: 'center' }}>
                            {camPerm?.canAskAgain === false ? 'Camera permission band hai - phone settings me allow kijiye' : 'Selfie ke liye camera chahiye'}
                        </Text>
                        {camPerm?.canAskAgain === false ? (
                            <Button title="Settings kholiye" variant="outline" onPress={() => Linking.openSettings()} />
                        ) : (
                            <Button title="Camera allow kijiye" onPress={requestCam} />
                        )}
                    </View>
                )}
                {!photo && camPerm?.granted ? (
                    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
                        <View style={{ width: '62%', aspectRatio: 0.78, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)', borderStyle: 'dashed' }} />
                        <Text style={{ color: '#fff', marginTop: 10, fontSize: 13 }}>Chehra gol ghere me rakhiye</Text>
                    </View>
                ) : null}
            </View>

            {camPerm?.granted ? (
                photo ? (
                    <Button title="Dobara photo lijiye" variant="outline" onPress={() => setPhoto(null)} />
                ) : (
                    <Button title={'\u{1F4F8}  Selfie lijiye'} onPress={capture} disabled={!ready} />
                )
            ) : null}

            {/* Location */}
            <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: '600', color: colors.foreground }}>{'\u{1F4CD}'} Location</Text>
                    {loc ? (
                        outside ? (
                            <Badge tone="danger">Campus ke bahar</Badge>
                        ) : dist !== null ? (
                            <Badge tone="success">Campus me</Badge>
                        ) : (
                            <Badge tone="muted">Mil gayi</Badge>
                        )
                    ) : null}
                </View>
                {loc ? (
                    <Subtle style={{ marginTop: 6 }}>
                        {dist !== null ? 'School se ' + (dist < 1000 ? dist + ' m' : (dist / 1000).toFixed(1) + ' km') + ' - ' : ''}GPS ±{Math.round(loc.accuracy || 0)} m
                    </Subtle>
                ) : locError ? (
                    <View style={{ marginTop: 6, gap: 8 }}>
                        <Text style={{ color: colors.destructive, fontSize: 13 }}>{locError}</Text>
                        <Button title="Dobara try kijiye" variant="outline" onPress={getLocation} />
                    </View>
                ) : (
                    <Subtle style={{ marginTop: 6 }}>Location le rahe hain...</Subtle>
                )}
                {loc?.mocked ? <Text style={{ color: colors.destructive, fontSize: 13, marginTop: 6 }}>Nakli (mock) location app pakdi gayi - ye record flag hoga</Text> : null}
                {outside && policy?.blockOutside ? (
                    <Text style={{ color: colors.destructive, fontSize: 13, marginTop: 6 }}>School ki policy: campus ke bahar se attendance nahi lagegi</Text>
                ) : null}
            </Card>

            {error ? <Text style={{ color: colors.destructive, textAlign: 'center' }}>{error}</Text> : null}

            <Button title={isIn ? 'Check-in kijiye' : 'Check-out kijiye'} onPress={submit} loading={busy} disabled={!canSubmit} />
            {!isIn && !photo ? <Subtle style={{ textAlign: 'center' }}>Check-out par selfie zaroori nahi</Subtle> : null}
            <Subtle style={{ textAlign: 'center', fontSize: 12 }}>Time server ka lagta hai. Selfie sirf school admin dekh sakte hain.</Subtle>
        </ScrollView>
    );
}
