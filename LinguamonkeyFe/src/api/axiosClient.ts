import axios, { InternalAxiosRequestConfig, AxiosError } from 'axios';
import * as Localization from 'expo-localization';
import * as Device from 'expo-device';
import { useTokenStore } from '../stores/tokenStore';
import eventBus from '../events/appEvents';
import { showToast } from '../components/Toast';

export const API_BASE_URL = 'https://api.example.com'; // Replace with your actual Env var if needed

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

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
    config.headers = Object.assign({}, config.headers, commonHeaders);
    return config;
});

// --- PRIVATE CLIENT ---
export const privateClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    timeout: 30000,
});

privateClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const commonHeaders = await getCommonHeaders();
        config.headers = Object.assign({}, config.headers, commonHeaders);

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
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

privateClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as CustomAxiosRequestConfig;
        const status = error.response?.status;

        // Xử lý hiển thị Toast cho các lỗi API (trừ 401 sẽ xử lý riêng bên dưới)
        if (status && status !== 401) {
            const data: any = error.response?.data;
            const backendMessage = data?.message || data?.error || 'Unknown error occurred';

            showToast({
                type: 'error',
                message: `[${status}] ${backendMessage}`,
            });
        } else if (!status && error.message) {
            // Lỗi mạng hoặc timeout không có status code
            showToast({
                type: 'error',
                message: `[Network] ${error.message}`,
            });
        }

        // Chỉ xử lý 401
        if (status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        // Bỏ qua nếu lỗi tại login endpoint
        if (originalRequest.url?.includes('/auth/login')) {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise(function (resolve, reject) {
                failedQueue.push({ resolve, reject });
            })
                .then((token) => {
                    if (originalRequest.headers) {
                        originalRequest.headers['Authorization'] = `Bearer ${token}`;
                    }
                    return privateClient(originalRequest);
                })
                .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const { refreshToken, setTokens } = useTokenStore.getState();

        if (!refreshToken) {
            eventBus.emit('logout');
            return Promise.reject(error);
        }

        try {
            const deviceId = await getDeviceIdSafe();
            const res = await publicClient.post('/api/v1/auth/refresh-token', {
                refreshToken: refreshToken,
                deviceId: deviceId,
            });

            const newAccess = res.data?.result?.token;
            const newRefresh = res.data?.result?.refreshToken;

            if (newAccess && newRefresh) {
                setTokens(newAccess, newRefresh);
                if (originalRequest.headers) {
                    originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
                }
                processQueue(null, newAccess);
                return privateClient(originalRequest);
            } else {
                throw new Error('Invalid tokens received');
            }
        } catch (err) {
            processQueue(err, null);
            eventBus.emit('logout');
            return Promise.reject(err);
        } finally {
            isRefreshing = false;
        }
    }
);

export default privateClient;