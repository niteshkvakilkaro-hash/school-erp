import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export const TOKEN_KEY = 'erpsc-token';

/**
 * Android emulator se laptop ka localhost 10.0.2.2 hota hai.
 * Asli phone par .env me apne laptop ka LAN IP daaliye.
 */
export const API_URL =
    process.env.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.apiUrl ||
    'http://10.0.2.2:5000/api';

const api = axios.create({ baseURL: API_URL, timeout: 15000 });

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
                (error.code === 'ECONNABORTED'
                    ? 'Server se connect nahi ho paaya - internet check kijiye'
                    : error.message),
            needsSchoolChoice: Boolean(data?.needsSchoolChoice),
            schools: data?.data?.schools || [],
        });
    }
);

export default api;
