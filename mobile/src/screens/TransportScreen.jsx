import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../lib/api';
import { useStudents } from '../context/StudentContext';
import { useTheme } from '../context/ThemeContext';
import { ChildSwitcher } from '../components/ChildSwitcher';
import { Card, Title, Subtle, Badge, Loader } from '../components/ui';

const TYPE_LABEL = { bus: 'Bus', 'mini-bus': 'Mini bus', van: 'Van', auto: 'Auto' };

/** Naam + phone, aur phone par tap karte hi call. */
function Contact({ role, name, phone }) {
    const { colors, radius } = useTheme();
    if (!name) return null;
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
                <Subtle>{role}</Subtle>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}>{name}</Text>
            </View>
            {phone ? (
                <TouchableOpacity
                    onPress={() => Linking.openURL('tel:' + phone)}
                    style={{
                        backgroundColor: colors.accent,
                        borderRadius: radius.full,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                    }}
                >
                    <Text style={{ color: colors.accentForeground, fontWeight: '600' }}>{'\u{1F4DE}'} Call</Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}

export default function TransportScreen() {
    const { active, loading: studentsLoading } = useStudents();
    const { colors, radius } = useTheme();
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
            const res = await api.get('/portal/students/' + active.id + '/transport');
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
                <Title>Transport</Title>
                <Subtle style={{ marginTop: 2 }}>
                    {busy ? 'Loading...' : data ? 'Route ' + data.route.code + ' - ' + data.route.name : 'School transport nahi liya'}
                </Subtle>
            </View>

            <ChildSwitcher />

            <ScrollView
                contentContainerStyle={{ padding: 16, gap: 12 }}
                refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={colors.primary} />}
            >
                {!data ? (
                    busy ? null : (
                        <Card>
                            <Subtle>
                                Is student ke liye school bus/van assigned nahi hai. Transport ke liye school office se sampark
                                kijiye.
                            </Subtle>
                        </Card>
                    )
                ) : (
                    <>
                        <View
                            style={{
                                backgroundColor: colors.primary,
                                borderRadius: radius.xl,
                                padding: 18,
                            }}
                        >
                            <Text style={{ color: colors.primaryForeground, opacity: 0.85, fontSize: 13 }}>Mera stop</Text>
                            <Text style={{ color: colors.primaryForeground, fontSize: 22, fontWeight: '700', marginTop: 2 }}>
                                {data.stop.name}
                            </Text>
                            <View style={{ flexDirection: 'row', marginTop: 14, gap: 24 }}>
                                <View>
                                    <Text style={{ color: colors.primaryForeground, opacity: 0.85, fontSize: 12 }}>Pickup (subah)</Text>
                                    <Text style={{ color: colors.primaryForeground, fontSize: 20, fontWeight: '700' }}>
                                        {data.stop.pickupTime || '--'}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={{ color: colors.primaryForeground, opacity: 0.85, fontSize: 12 }}>Drop (chhutti)</Text>
                                    <Text style={{ color: colors.primaryForeground, fontSize: 20, fontWeight: '700' }}>
                                        {data.stop.dropTime || '--'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {data.vehicle ? (
                            <Card>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={{ fontSize: 17, fontWeight: '700', color: colors.foreground }}>
                                        {'\u{1F68C}'} {data.vehicle.regNo}
                                    </Text>
                                    <Badge>{TYPE_LABEL[data.vehicle.type] || data.vehicle.type}</Badge>
                                </View>
                                <Contact role="Driver" name={data.vehicle.driverName} phone={data.vehicle.driverPhone} />
                                <Contact role="Helper" name={data.vehicle.helperName} phone={data.vehicle.helperPhone} />
                            </Card>
                        ) : null}

                        <Card>
                            <Subtle style={{ fontWeight: '600', marginBottom: 10 }}>ROUTE KE STOPS</Subtle>
                            {data.stops.map((s, i) => {
                                const mine = s.id === data.stop.id;
                                return (
                                    <View key={s.id} style={{ flexDirection: 'row', gap: 12 }}>
                                        <View style={{ alignItems: 'center', width: 16 }}>
                                            <View
                                                style={{
                                                    width: 14,
                                                    height: 14,
                                                    borderRadius: 7,
                                                    marginTop: 3,
                                                    borderWidth: 2,
                                                    borderColor: colors.primary,
                                                    backgroundColor: mine ? colors.primary : colors.card,
                                                }}
                                            />
                                            {i < data.stops.length - 1 ? (
                                                <View style={{ flex: 1, width: 2, backgroundColor: colors.border }} />
                                            ) : null}
                                        </View>
                                        <View style={{ flex: 1, paddingBottom: 14 }}>
                                            <Text
                                                style={{
                                                    fontSize: 15,
                                                    fontWeight: mine ? '700' : '500',
                                                    color: mine ? colors.primary : colors.foreground,
                                                }}
                                            >
                                                {s.name}
                                                {mine ? '  (mera stop)' : ''}
                                            </Text>
                                            <Subtle>
                                                Pickup {s.pickupTime || '--'} - Drop {s.dropTime || '--'}
                                            </Subtle>
                                        </View>
                                    </View>
                                );
                            })}
                        </Card>

                        <Card>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Subtle>Monthly fare</Subtle>
                                <Text style={{ fontWeight: '700', color: colors.foreground }}>
                                    Rs {Number(data.route.monthlyFare).toLocaleString('en-IN')}
                                </Text>
                            </View>
                        </Card>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
