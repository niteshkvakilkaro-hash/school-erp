import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const TOKEN_KEY = 'erpsc-token';

/**
 * Development me API usi laptop par chalti hai jahan se Expo app serve kar raha
 * hai - uska IP khud nikal lete hain, taaki phone (Expo Go / browser) par bina
 * setting ke chale. Build (APK) ke liye EXPO_PUBLIC_API_URL dena zaroori hai.
 */
function devServerApi() {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
        return 'http://' + window.location.hostname + ':5000/api';
    }
    const host = (Constants.expoConfig?.hostUri || '').split(':')[0];
    // Emulator ka localhost khud emulator hota hai - wahan 10.0.2.2
    if (host && host !== 'localhost' && host !== '127.0.0.1') return 'http://' + host + ':5000/api';
    return null;
}

export const API_URL =
    process.env.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.apiUrl ||
    devServerApi() ||
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
