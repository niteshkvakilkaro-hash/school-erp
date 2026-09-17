import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

const StudentContext = createContext(null);

/**
 * Parent ke kai bachche ho sakte hain - app me ek "active child" rehta hai
 * jise header se badla ja sakta hai. Student login me sirf ek hi hota hai.
 */
export function StudentProvider({ children }) {
    const { isAuthenticated } = useAuth();
    const [students, setStudents] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [school, setSchool] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await api.get('/portal/me/students');
            setStudents(data.data.students);
            setSchool(data.data.school);
            setActiveId((prev) => {
                const stillThere = data.data.students.some((s) => s.id === prev);
                return stillThere ? prev : (data.data.students[0]?.id ?? null);
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) load();
        else {
            setStudents([]);
            setActiveId(null);
        }
    }, [isAuthenticated, load]);

    const value = useMemo(
        () => ({
            students,
            school,
            loading,
            error,
            reload: load,
            activeId,
            setActiveId,
            active: students.find((s) => s.id === activeId) || null,
            hasMultiple: students.length > 1,
        }),
        [students, school, loading, error, load, activeId]
    );

    return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
}

export const useStudents = () => {
    const ctx = useContext(StudentContext);
    if (!ctx) throw new Error('useStudents ko StudentProvider ke andar use kijiye');
    return ctx;
};
