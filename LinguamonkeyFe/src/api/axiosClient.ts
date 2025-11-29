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
        'Content-Type': 'application/json',
    };
};

const DEV_LOG_ENABLED = typeof (global as any).__DEV__ !== 'undefined' && (global as any).__DEV__;

// --- PUBLIC CLIENT ---
export const publicClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
});

publicClient.interceptors.request.use(async (config) => {
    const commonHeaders = await getCommonHeaders();

    // Fix: Common headers are defaults, config.headers must override them
    config.headers = Object.assign({}, commonHeaders, config.headers) as any;

    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }

    if (DEV_LOG_ENABLED && config.data) {
        // Avoid stringifying FormData to prevent crash/noise
        const logBody = config.data instanceof FormData ? '[FormData]' : JSON.stringify(config.data);
        console.log(`[REQ][PUBLIC] ${config.method?.toUpperCase()} ${config.url}\nBody: ${logBody}`);
    }

    return config;
});

const isUserFacing = (errorCode: number): boolean => {
    const status = Math.floor(errorCode / 1000);
    return status === 1 || status === 4 || status === 6;
}

const handleErrorResponse = (error: AxiosError) => {
    const httpStatus = error.response?.status;
    const data = error.response?.data as AppApiResponseError | undefined;

    if (!httpStatus) {
        showToast({
            title: i18n.t('error.connection_message'),
            type: 'error',
        });
        return;
    }

    if (httpStatus === 401 || httpStatus === 403) {
        return;
    }

    if (data?.message && data.code) {
        let toastType: 'error' | 'warning' | 'info' = 'info';
        let defaultTitleKey: string;

        if (httpStatus >= 400 && httpStatus < 500) {
            toastType = 'warning';
            defaultTitleKey = 'error.warning_title';
        } else if (httpStatus >= 500) {
            toastType = 'error';
            defaultTitleKey = 'error.server_error_title';
        } else {
            defaultTitleKey = 'error.info_title';
        }

        if (isUserFacing(data.code)) {
            showToast({
                title: i18n.t(defaultTitleKey),
                type: toastType,
                message: data.message,
            });
            return;
        }
    }

    if (httpStatus >= 400) {
        let titleKey: string;
        let messageKey: string;

        if (httpStatus >= 500) {
            titleKey = 'error.system_error_title';
        } else {
            titleKey = 'error.request_error_title';
        }

        messageKey = 'error.generic_message';

        showToast({
            title: i18n.t(titleKey),
            type: 'error',
            message: i18n.t(messageKey),
        });
        return;
    }
};

publicClient.interceptors.response.use(
    (response) => {
        if (DEV_LOG_ENABLED) {
            console.log(`[RES][PUBLIC] ${response.config.method?.toUpperCase()} ${response.config.url}\nStatus: ${response.status}`);
        }
        return response;
    },
    (error: AxiosError) => {
        if (DEV_LOG_ENABLED) {
            const status = error.response?.status;
            const data = error.response?.data;
            const url = error.config?.url;
            console.error(`[ERR][PUBLIC] ${error.config?.method?.toUpperCase()} ${url}\nStatus: ${status}\nBody: ${JSON.stringify(data || error.message)}`);
        }
        handleErrorResponse(error);
        return Promise.reject(error);
    }
);

export const privateClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    timeout: 30000,
});

privateClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const commonHeaders = await getCommonHeaders();

        // Fix: Common headers are defaults, config.headers must override them
        config.headers = Object.assign({}, commonHeaders, config.headers) as any;

        const { accessToken } = useTokenStore.getState();
        if (accessToken && !config.headers['Authorization']) {
            config.headers['Authorization'] = `Bearer ${accessToken}`;
        }

        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        if (DEV_LOG_ENABLED && config.data) {
            const logBody = config.data instanceof FormData ? '[FormData]' : JSON.stringify(config.data);
            console.log(`[REQ][PRIVATE] ${config.method?.toUpperCase()} ${config.url}\nBody: ${logBody}`);
        }

        return config;
    },
    (error) => Promise.reject(error)
);

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
    (response: AxiosResponse) => {
        if (DEV_LOG_ENABLED) {
            console.log(`[RES][PRIVATE] ${response.config.method?.toUpperCase()} ${response.config.url}\nStatus: ${response.status}`);
        }
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as CustomAxiosRequestConfig;
        const httpStatus = error.response?.status;

        if (DEV_LOG_ENABLED) {
            const data = error.response?.data;
            const url = error.config?.url;
            console.error(`[ERR][PRIVATE] ${error.config?.method?.toUpperCase()} ${url}\nStatus: ${httpStatus}\nBody: ${JSON.stringify(data || error.message)}`);
        }

        if (httpStatus !== 401 && httpStatus !== 403) {
            handleErrorResponse(error);
        } else if (!httpStatus && error.message) {
            handleErrorResponse(error);
        }

        if (httpStatus !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

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