import axios, { InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import * as Localization from 'expo-localization';
import * as Device from 'expo-device';
import { useTokenStore } from '../stores/tokenStore';
import eventBus from '../events/appEvents';
import { showToast } from '../components/Toast';
import { API_BASE_URL } from './apiConfig';
import i18n from '../i18n/index';

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
    _startTime?: number;
}

interface AppApiResponseError {
    code: number;
    message: string;
    result: null;
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
    };
};

const DEV_LOG_ENABLED = true;

const logRequest = (config: CustomAxiosRequestConfig) => {
    if (!DEV_LOG_ENABLED) return;
    const { method, url } = config;
    console.log(`🚀 [REQ] ${method?.toUpperCase()} ${url}`);
};

const logResponse = (response: AxiosResponse) => {
    if (!DEV_LOG_ENABLED) return;
    const { config, status } = response;
    console.log(`✅ [RES] ${status} ${config.url}`);
};

const logError = (error: AxiosError) => {
    const config = error.config as CustomAxiosRequestConfig;
    const status = error.response?.status;
    console.log(`🔥 [ERR] ${status || 'Unknown'} ${config?.url}`);
    console.log(`❌ [ERR MSG]: ${error.message}`);
};

const handleErrorResponse = (error: AxiosError) => {
    const httpStatus = error.response?.status;
    const data = error.response?.data as AppApiResponseError | undefined;

    if (!httpStatus) {
        if (error.message !== 'canceled') {
            const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
            const message = isTimeout
                ? i18n.t('error.timeout_message')
                : i18n.t('error.connection_message');
            showToast({ message: message, type: 'error' });
        }
        return;
    }

    if (httpStatus >= 500) return;
    if (httpStatus === 401 || httpStatus === 403 || httpStatus === 429) return;

    if (data?.message) {
        showToast({ message: data.message, type: 'error' });
    } else if (httpStatus >= 400 && httpStatus < 500) {
        showToast({ message: i18n.t('error.default_client_message'), type: 'error' });
    }
};

export const publicClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});

export const privateClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});

export const mediaClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 300000,
    headers: { 'Accept': 'application/json' },
});

const setupInterceptors = (client: any, isPrivate: boolean = true) => {
    let isRefreshing = false;
    let failedQueue: any[] = [];

    const processQueue = (error: any, token: string | null = null) => {
        failedQueue.forEach((prom) => {
            if (error) prom.reject(error);
            else prom.resolve(token);
        });
        failedQueue = [];
    };

    client.interceptors.request.use(
        async (config: InternalAxiosRequestConfig) => {
            const commonHeaders = await getCommonHeaders();
            config.headers = Object.assign({}, commonHeaders, config.headers) as any;

            if (isPrivate) {
                const { accessToken } = useTokenStore.getState();
                if (accessToken && !config.headers['Authorization']) {
                    config.headers['Authorization'] = `Bearer ${accessToken}`;
                }
            }

            logRequest(config);
            return config;
        },
        (error: any) => Promise.reject(error)
    );

    client.interceptors.response.use(
        (response: AxiosResponse) => {
            logResponse(response);
            return response;
        },
        async (error: AxiosError) => {
            const originalRequest = error.config as CustomAxiosRequestConfig;
            const httpStatus = error.response?.status;

            logError(error);

            if (httpStatus !== 401 && httpStatus !== 403) {
                handleErrorResponse(error);
            }

            if (httpStatus !== 401 || originalRequest._retry || !isPrivate) {
                return Promise.reject(error);
            }

            if (originalRequest.url?.includes('/auth/refresh-token')) {
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
                        return client(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const { refreshToken, setTokens } = useTokenStore.getState();

            if (!refreshToken) {
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
                    return client(originalRequest);
                } else {
                    throw new Error('Invalid tokens');
                }
            } catch (err) {
                processQueue(err, null);
                eventBus.emit('auth.session_expired');
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }
    );
};

setupInterceptors(publicClient, false);
setupInterceptors(privateClient, true);
setupInterceptors(mediaClient, true);

export default privateClient;