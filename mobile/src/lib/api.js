import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Admin panel ('erpsc-token') se alag - dono ek hi site par khulein to ek-doosre ka login na chhuen
export const TOKEN_KEY = 'erpsc-app-token';
const SERVER_KEY = 'erpsc-server';

/**
 * Default API ka address:
 * - build ke waqt EXPO_PUBLIC_API_URL diya ho to wahi
 * - web par, jab app hamare backend se hi serve ho (demo/tunnel link) -> usi site ka /api
 * - development me usi laptop ka IP jahan se Expo chal raha hai (port 5000)
 * - emulator: 10.0.2.2
 * User login screen se "Server" badal sakta hai - wo AsyncStorage me yaad rehta hai.
 */
function defaultApi() {
    if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
    if (Constants.expoConfig?.extra?.apiUrl) return Constants.expoConfig.extra.apiUrl;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
        // Export (production) build backend ke saath ek hi origin par chalti hai
        if (!__DEV__) return window.location.origin + '/api';
        return 'http://' + window.location.hostname + ':5000/api';
    }
    const host = (Constants.expoConfig?.hostUri || '').split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') return 'http://' + host + ':5000/api';
    return 'http://10.0.2.2:5000/api';
}

export const DEFAULT_API = defaultApi();
export let API_URL = DEFAULT_API;

const api = axios.create({ baseURL: API_URL, timeout: 20000 });

/** "abc.trycloudflare.com" jaisa kuch bhi -> "https://abc.trycloudflare.com/api" */
export function normalizeServer(input) {
    let v = String(input || '').trim().replace(/\/+$/, '');
    if (!v) return null;
    if (!/^https?:\/\//i.test(v)) v = (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?$|^localhost/.test(v) ? 'http://' : 'https://') + v;
    if (!/\/api$/.test(v)) v += '/api';
    return v;
}

function apply(url) {
    API_URL = url;
    api.defaults.baseURL = url;
}

/** App khulte hi - pehle se chuna hua server. */
export async function loadServer() {
    try {
        const saved = await AsyncStorage.getItem(SERVER_KEY);
        if (saved) apply(saved);
    } catch {
        /* default hi sahi */
    }
    return API_URL;
}

/** Naya server - pehle /health se check, tab save. null = default par wapas. */
export async function setServer(input) {
    if (!input) {
        await AsyncStorage.removeItem(SERVER_KEY);
        apply(DEFAULT_API);
        return DEFAULT_API;
    }
    const url = normalizeServer(input);
    if (!url) throw { message: 'Server ka address daaliye' };
    try {
        const res = await axios.get(url + '/health', { timeout: 10000 });
        if (!res.data?.success) throw new Error();
    } catch {
        throw { message: 'Is address par ERPSC server nahi mila - link check kijiye' };
    }
    await AsyncStorage.setItem(SERVER_KEY, url);
    apply(url);
    return url;
}

api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = 'Bearer ' + token;
    return config;
});

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
    onUnauthorized = fn;
};

api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const status = error.response?.status;
        const data = error.response?.data;

        if (status === 401 && !error.config?.url?.includes('/auth/login')) {
            await AsyncStorage.removeItem(TOKEN_KEY);
            onUnauthorized?.();
        }

        return Promise.reject({
            status,
            message:
                data?.message ||
                (error.code === 'ECONNABORTED' || !error.response
                    ? 'Server se connect nahi ho paaya - internet ya server address check kijiye'
                    : error.message),
            needsSchoolChoice: Boolean(data?.needsSchoolChoice),
            schools: data?.data?.schools || [],
            response: error.response,
        });
    }
);

export default api;
