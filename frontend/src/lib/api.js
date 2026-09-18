import axios from 'axios';

export const TOKEN_KEY = 'erpsc-token';
export const SCHOOL_KEY = 'erpsc-active-school';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = 'Bearer ' + token;

    // Super admin jab kisi school ke andar jhaank raha ho
    const activeSchool = localStorage.getItem(SCHOOL_KEY);
    if (activeSchool) config.headers['X-School-Id'] = activeSchool;

    return config;
});

api.interceptors.response.use(
    (res) => res,
    (error) => {
        const status = error.response?.status;
        const data = error.response?.data;

        // Public school website (/site/...) par visitor ko login page par nahi bhejna
        const onPublicPage = window.location.pathname.startsWith('/site/');
        if (status === 401 && !error.config?.url?.includes('/auth/login') && !onPublicPage) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(SCHOOL_KEY);
            if (window.location.pathname !== '/login') window.location.href = '/login';
        }

        return Promise.reject({
            status,
            message: data?.message || error.message || 'Server se connect nahi ho paaya',
            // Login par "ye email kai schools me hai" wala case
            needsSchoolChoice: Boolean(data?.needsSchoolChoice),
            schools: data?.data?.schools || [],
            fieldErrors: (data?.errors || []).reduce((acc, e) => {
                acc[e.field] = e.message;
                return acc;
            }, {}),
            raw: error,
        });
    }
);

export const setActiveSchool = (id) => {
    if (id) localStorage.setItem(SCHOOL_KEY, String(id));
    else localStorage.removeItem(SCHOOL_KEY);
};

export const getActiveSchool = () => localStorage.getItem(SCHOOL_KEY);

export default api;
