import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export function Card({ style, children }) {
    const { colors, radius } = useTheme();
    return (
        <View
            style={[
                {
                    backgroundColor: colors.card,
                    borderRadius: radius.lg,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: colors.border,
                    padding: 16,
                },
                style,
            ]}
        >
            {children}
        </View>
    );
}

export function Title({ children, style }) {
    const { colors } = useTheme();
    return (
        <Text style={[{ fontSize: 20, fontWeight: '600', color: colors.foreground }, style]}>
            {children}
        </Text>
    );
}

export function Subtle({ children, style }) {
    const { colors } = useTheme();
    return <Text style={[{ fontSize: 13, color: colors.mutedForeground }, style]}>{children}</Text>;
}

export function Body({ children, style }) {
    const { colors } = useTheme();
    return <Text style={[{ fontSize: 15, color: colors.foreground }, style]}>{children}</Text>;
}

export function Button({ title, onPress, loading, disabled, variant = 'primary', style }) {
    const { colors, radius } = useTheme();
    const isOutline = variant === 'outline';

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.85}
            style={[
                {
                    height: 48,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                    paddingHorizontal: 16,
                    backgroundColor: isOutline ? 'transparent' : colors.primary,
                    borderWidth: isOutline ? StyleSheet.hairlineWidth : 0,
                    borderColor: colors.border,
                    opacity: disabled || loading ? 0.6 : 1,
                },
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={isOutline ? colors.foreground : colors.primaryForeground} />
            ) : null}
            <Text
                style={{
                    color: isOutline ? colors.foreground : colors.primaryForeground,
                    fontWeight: '600',
                    fontSize: 15,
                }}
            >
                {title}
            </Text>
        </TouchableOpacity>
    );
}

export function Input({ label, error, style, ...props }) {
    const { colors, radius } = useTheme();
    return (
        <View style={{ gap: 6 }}>
            {label ? (
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.foreground }}>
                    {label}
                </Text>
            ) : null}
            <TextInput
                placeholderTextColor={colors.mutedForeground}
                style={[
                    {
                        height: 48,
                        borderRadius: radius.md,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: error ? colors.destructive : colors.input,
                        backgroundColor: colors.card,
                        color: colors.foreground,
                        paddingHorizontal: 14,
                        fontSize: 15,
                    },
                    style,
                ]}
                {...props}
            />
            {error ? <Text style={{ fontSize: 12, color: colors.destructive }}>{error}</Text> : null}
        </View>
    );
}

export function Badge({ children, tone = 'default' }) {
    const { colors, radius } = useTheme();
    const tones = {
        default: { bg: colors.accent, fg: colors.accentForeground },
        muted: { bg: colors.muted, fg: colors.mutedForeground },
        warning: { bg: colors.warning + '22', fg: colors.warning },
    };
    const t = tones[tone] || tones.default;

    return (
        <View
            style={{
                backgroundColor: t.bg,
                borderRadius: radius.full,
                paddingHorizontal: 10,
                paddingVertical: 4,
                alignSelf: 'flex-start',
            }}
        >
            <Text style={{ color: t.fg, fontSize: 12, fontWeight: '600' }}>{children}</Text>
        </View>
    );
}

/** Label ke saath ek row - profile screens me baar baar chahiye. */
export function Row({ label, value }) {
    const { colors } = useTheme();
    return (
        <View
            style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 10,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
            }}
        >
            <Text style={{ fontSize: 14, color: colors.mutedForeground }}>{label}</Text>
            <Text
                style={{ fontSize: 14, color: colors.foreground, fontWeight: '500', flexShrink: 1 }}
                numberOfLines={2}
            >
                {value || '-'}
            </Text>
        </View>
    );
}

export function Screen({ children, style }) {
    const { colors } = useTheme();
    return (
        <View style={[{ flex: 1, backgroundColor: colors.background }, style]}>{children}</View>
    );
}

export function Loader({ text }) {
    const { colors } = useTheme();
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            {text ? <Subtle>{text}</Subtle> : null}
        </View>
    );
}

export function ErrorState({ message, onRetry }) {
    const { colors } = useTheme();
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
            <Text style={{ fontSize: 15, color: colors.destructive, textAlign: 'center' }}>
                {message}
            </Text>
            {onRetry ? <Button title="Dubara try kijiye" variant="outline" onPress={onRetry} /> : null}
        </View>
    );
}

export function Avatar({ name, size = 44 }) {
    const { colors } = useTheme();
    const initials = (name || '')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();

    return (
        <View
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text style={{ color: colors.primaryForeground, fontWeight: '700', fontSize: size * 0.36 }}>
                {initials || '?'}
            </Text>
        </View>
    );
}
