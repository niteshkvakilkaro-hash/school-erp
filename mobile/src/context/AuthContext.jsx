import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { TOKEN_KEY, setUnauthorizedHandler } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    const logout = useCallback(async () => {
        await AsyncStorage.removeItem(TOKEN_KEY);
        setSession(null);
    }, []);

    // Token expire hone par api layer yahi call karta hai
    useEffect(() => {
        setUnauthorizedHandler(() => setSession(null));
    }, []);

    useEffect(() => {
        (async () => {
            const token = await AsyncStorage.getItem(TOKEN_KEY);
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const { data } = await api.get('/auth/me');
                setSession(data.data);
            } catch {
                await AsyncStorage.removeItem(TOKEN_KEY);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const login = useCallback(async (email, password, schoolCode) => {
        const body = { email, password };
        if (schoolCode) body.schoolCode = schoolCode;

        const { data } = await api.post('/auth/login', body);

        // Ye app sirf parent aur student ke liye hai. Staff ko andar ghusne dene se
        // wo har screen par 403 dekhta - isliye yahin saaf message de dete hain.
        const perms = data.data.permissions || [];
        const canUseApp = perms.includes('portal.self.view') || perms.includes('portal.child.view');
        if (!canUseApp) {
            throw {
                message:
                    'Ye app sirf parents aur students ke liye hai. ' +
                    (data.data.user?.role?.name || 'Aapka role') +
                    ' ke liye web admin panel use kijiye.',
            };
        }

        await AsyncStorage.setItem(TOKEN_KEY, data.data.token);
        setSession(data.data);
        return data.data;
    }, []);

    const value = useMemo(
        () => ({
            session,
            user: session?.user || null,
            school: session?.school || null,
            loading,
            login,
            logout,
            isAuthenticated: Boolean(session),
        }),
        [session, loading, login, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth ko AuthProvider ke andar use kijiye');
    return ctx;
};
