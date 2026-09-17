import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import api, { TOKEN_KEY } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            setLoading(false);
            return;
        }
        api.get('/auth/me')
            .then(({ data }) => setSession(data.data))
            .catch(() => localStorage.removeItem(TOKEN_KEY))
            .finally(() => setLoading(false));
    }, []);

    const login = useCallback(async (email, password, schoolCode) => {
        const body = { email, password };
        if (schoolCode) body.schoolCode = schoolCode;

        const { data } = await api.post('/auth/login', body);
        localStorage.setItem(TOKEN_KEY, data.data.token);
        setSession(data.data);
        return data.data;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        setSession(null);
    }, []);

    const refresh = useCallback(async () => {
        const { data } = await api.get('/auth/me');
        setSession(data.data);
    }, []);

    const value = useMemo(() => {
        const permissions = new Set(session?.permissions || []);
        return {
            session,
            user: session?.user || null,
            school: session?.school || null,
            profile: session?.profile || null,
            permissions,
            loading,
            login,
            logout,
            refresh,
            isAuthenticated: Boolean(session),
            // Super admin ka schoolId null hota hai
            isPlatform: Boolean(session) && session.user?.schoolId === null,
            /** can('students.create') - ek bhi permission ho to true */
            can: (...slugs) => slugs.some((s) => permissions.has(s)),
        };
    }, [session, loading, login, logout, refresh]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth ko AuthProvider ke andar hi use kijiye');
    return ctx;
}
