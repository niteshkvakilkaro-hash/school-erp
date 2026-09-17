import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useStudents } from '../context/StudentContext';
import { useTheme } from '../context/ThemeContext';

/**
 * Parent ke ek se zyada bachche hone par hi dikhta hai - upar chips ki row,
 * jisse active child badal jata hai.
 */
export function ChildSwitcher() {
    const { students, activeId, setActiveId, hasMultiple } = useStudents();
    const { colors, radius } = useTheme();

    if (!hasMultiple) return null;

    return (
        <View style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ padding: 12, gap: 8 }}
            >
                {students.map((s) => {
                    const active = s.id === activeId;
                    return (
                        <TouchableOpacity
                            key={s.id}
                            onPress={() => setActiveId(s.id)}
                            activeOpacity={0.8}
                            style={{
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                borderRadius: radius.full,
                                backgroundColor: active ? colors.primary : colors.card,
                                borderWidth: StyleSheet.hairlineWidth,
                                borderColor: active ? colors.primary : colors.border,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 13,
                                    fontWeight: '600',
                                    color: active ? colors.primaryForeground : colors.foreground,
                                }}
                            >
                                {s.name}
                            </Text>
                            <Text
                                style={{
                                    fontSize: 11,
                                    color: active ? colors.primaryForeground : colors.mutedForeground,
                                }}
                            >
                                {s.className || 'Unassigned'}
                                {s.sectionName ? ' - ' + s.sectionName : ''}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}
