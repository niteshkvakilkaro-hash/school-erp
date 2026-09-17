import { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { getColors, radius, spacing, brand } from '../lib/theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    // Phone ki system setting follow karte hain - alag toggle ki zaroorat nahi
    const scheme = useColorScheme();

    const value = useMemo(
        () => ({
            scheme: scheme === 'dark' ? 'dark' : 'light',
            colors: getColors(scheme),
            radius,
            spacing,
            brand,
        }),
        [scheme]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme ko ThemeProvider ke andar use kijiye');
    return ctx;
};
