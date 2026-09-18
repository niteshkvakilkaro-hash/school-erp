import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { TOKEN_KEY, setUnauthorizedHandler, loadServer } from '../lib/api';

const AuthContext = createContext(null);

/** 'family' = parent/student screens, 'staff' = teacher/staff screens. */
export function modeFor(perms = []) {
    if (perms.includes('portal.self.view') || perms.includes('portal.child.view')) return 'family';
    if (perms.includes('hr.self')) return 'staff';
    return null;
}

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
            // Login screen par chuna server (APK / tunnel link) pehle
            await loadServer();
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

        // App parent/student (portal) aur staff (apni attendance - hr.self) ke liye hai.
        // Jiske paas dono me se kuch nahi, use yahin saaf message.
        if (!modeFor(data.data.permissions)) {
            throw {
                message:
                    (data.data.user?.role?.name || 'Aapka role') +
                    ' ke liye app me kuch nahi hai - web admin panel use kijiye.',
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
            permissions: session?.permissions || [],
            mode: modeFor(session?.permissions),
            can: (p) => (session?.permissions || []).includes(p),
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
