import axios, { InternalAxiosRequestConfig, AxiosError } from 'axios';
import * as Localization from 'expo-localization';
import * as Device from 'expo-device';
import { API_BASE_URL } from './apiConfig';
import { useTokenStore } from '../stores/tokenStore';
import eventBus from '../events/appEvents';

export async function getDeviceIdSafe() {
    try {
        const deviceId =
            Device.osInternalBuildId ||
            Device.modelId ||
            Device.modelName ||
            Device.deviceName ||
            'unknown-device';
        return typeof deviceId === 'string' ? deviceId : 'unknown-device';
    } catch (err) {
        return 'unknown-device';
    }
}

// Helper function để lấy headers chung
const getCommonHeaders = async () => {
    const deviceId = await getDeviceIdSafe();
    const userLocale = Localization.getLocales()[0]?.languageTag || 'en-US';
    return {
        'Device-Id': deviceId,
        'Accept-Language': userLocale,
        'Content-Type': 'application/json',
    };
};

// --- PUBLIC CLIENT ---
export const publicClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
});

publicClient.interceptors.request.use(async (config) => {
    const commonHeaders = await getCommonHeaders();

    // ⚠️ FIX QUAN TRỌNG: Không dùng spread operator {...config.headers}
    // Hãy gán từng giá trị vào để bảo toàn Authorization header nếu đã có
    if (!config.headers) {
        config.headers = {} as any;
    }

    Object.entries(commonHeaders).forEach(([key, value]) => {
        config.headers[key] = value;
    });

    return config;
});

// --- PRIVATE CLIENT ---
export const privateClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    timeout: 15000,
});

privateClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const commonHeaders = await getCommonHeaders();

        // Merge common headers an toàn
        Object.entries(commonHeaders).forEach(([key, value]) => {
            config.headers[key] = value;
        });

        // Lấy token từ store nếu chưa có Authorization
        const { accessToken } = useTokenStore.getState();
        if (accessToken && !config.headers['Authorization']) {
            config.headers['Authorization'] = `Bearer ${accessToken}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// --- INTERCEPTOR REFRESH TOKEN ---
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

privateClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Chỉ xử lý 401, các lỗi khác (như 500, 400 do thiếu header) reject luôn
        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        if (originalRequest.url?.includes('/auth/login')) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;
        const { refreshToken, setTokens } = useTokenStore.getState();

        if (!refreshToken) {
            eventBus.emit('logout');
            return Promise.reject(error);
        }

        if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = publicClient.post('/api/v1/auth/refresh-token', {
                refreshToken: refreshToken,
                deviceId: await getDeviceIdSafe()
            })
                .then((res) => {
                    const newAccess = res.data?.result?.token;
                    const newRefresh = res.data?.result?.refreshToken;
                    if (newAccess && newRefresh) {
                        setTokens(newAccess, newRefresh);
                        return newAccess;
                    }
                    throw new Error('Invalid refresh response');
                })
                .catch((err) => {
                    eventBus.emit('logout');
                    return null;
                })
                .finally(() => {
                    isRefreshing = false;
                    refreshPromise = null;
                });
        }

        const newToken = await refreshPromise;

        if (newToken) {
            // Update lại header cho request đang chờ
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return privateClient(originalRequest);
        }

        return Promise.reject(error);
    }
);

export default privateClient;