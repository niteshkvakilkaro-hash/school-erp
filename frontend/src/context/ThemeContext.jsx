import { createContext, useContext, useCallback, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const KEY = 'erpsc-theme';

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem(KEY) || 'light';
        } catch {
            return 'light';
        }
    });

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        try {
            localStorage.setItem(KEY, theme);
        } catch {
            /* private mode - ignore */
        }
    }, [theme]);

    const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

    return <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
