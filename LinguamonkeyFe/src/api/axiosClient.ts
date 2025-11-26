import axios, { InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import * as Localization from 'expo-localization';
import * as Device from 'expo-device';
import { useTokenStore } from '../stores/tokenStore';
import eventBus from '../events/appEvents';
import { showToast } from '../components/Toast';
import { API_BASE_URL } from './apiConfig';

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

// Cập nhật Định nghĩa cấu trúc phản hồi lỗi từ BE
interface AppApiResponseError {
    code: number; // ErrorCode.code
    message: string; // ErrorCode.message (i18n key)
    result: null; // Luôn là null khi lỗi
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

const DEV_LOG_ENABLED = typeof global.__DEV__ !== 'undefined' && global.__DEV__;

// --- PUBLIC CLIENT ---
export const publicClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
});

// Thêm Dev Logging cho publicClient Request
publicClient.interceptors.request.use(async (config) => {
    const commonHeaders = await getCommonHeaders();
    config.headers = Object.assign({}, config.headers, commonHeaders);

    if (DEV_LOG_ENABLED && config.data) {
        console.log(`[REQ][PUBLIC] ${config.method?.toUpperCase()} ${config.url}\nBody: ${JSON.stringify(config.data)}`);
    }

    return config;
});

// Hàm kiểm tra UserFacing (Giả định Logic UserFacing dựa trên ErrorCode)
// Do BE không gửi lại userFacing trực tiếp, FE phải giả định/xác định lỗi hiển thị.
// Tốt nhất là BE luôn gửi lại userFacing. Tạm thời, ta dùng logic sau:
const isUserFacing = (errorCode: number): boolean => {
    // Dựa trên ErrorCode.java đã cung cấp (4000-4702, 1000-1502, 6000-6001 là userFacing=true)
    // Tức là 4xx (trừ 401, 403, 405, 415) và 409 là hiển thị.
    // Nếu BE không gửi userFacing, FE phải có 1 map ErrorCode để kiểm tra. 
    // Giả định đơn giản: Mọi lỗi 4xx (Client Error) đều là hiển thị, trừ 401/403.
    // Nếu bạn muốn chi tiết hơn, bạn cần định nghĩa map ErrorCode.
    // TẠM THỜI: dựa vào HTTP Status Code để xác định lỗi hiển thị cho người dùng (4xx, 5xx).
    // Tuy nhiên, để tuân thủ logic BE cũ (userFacing), ta cần thông tin BE.
    // **Do BE không còn gửi userFacing, ta phải dựa vào Status Code:**
    const status = Math.floor(errorCode / 1000); // Lấy nhóm lỗi
    return status === 1 || status === 4 || status === 6; // 1xxx, 4xxx, 6xxx (Bad Request, Not Found, Conflict)
}


// Hàm xử lý hiển thị Toast theo logic mới (Dùng Status Code HTTP và Error Code BE)
const handleErrorResponse = (error: AxiosError) => {
    const httpStatus = error.response?.status;
    const data = error.response?.data as AppApiResponseError | undefined;

    // Xử lý Lỗi Mạng/Timeout (Không có status code)
    if (!httpStatus) {
        showToast({
            type: 'error',
            message: error.message || 'Lỗi kết nối mạng hoặc timeout.',
        });
        return;
    }

    // KHÔNG hiển thị Toast cho 401 Unauthorized và 403 Forbidden
    if (httpStatus === 401 || httpStatus === 403) {
        return;
    }

    // Xử lý lỗi từ BE: Chỉ hiển thị nếu có message và dựa trên logic userFacing/status code
    if (data?.message && data.code) {

        let toastType: 'error' | 'warning' | 'info' = 'info';

        // 1. Dựa vào HTTP Status Code để xác định màu nền
        if (httpStatus >= 400 && httpStatus < 500) {
            toastType = 'warning'; // Vàng/Cam cho lỗi Client (4xx)
        } else if (httpStatus >= 500) {
            toastType = 'error'; // Đỏ cho lỗi Server (5xx)
        }

        // 2. Dựa vào BE Error Code để kiểm tra xem có nên hiển thị không (userFacing logic)
        // Nếu BE không còn gửi userFacing, ta phải tự kiểm tra mã lỗi (isUserFacing)
        if (isUserFacing(data.code)) {
            // Hiển thị message i18n từ BE
            showToast({
                type: toastType,
                message: data.message,
            });
            return;
        }

    }

    // Fallback: Lỗi hệ thống 5xx hoặc lỗi 4xx không mong muốn/ không hiển thị
    if (httpStatus >= 500) {
        showToast({
            type: 'error',
            message: `Lỗi hệ thống (${httpStatus}). Vui lòng thử lại sau.`,
        });
    }
    // Các lỗi 4xx không hiển thị (userFacing=false, 405, 415) sẽ được bỏ qua
};


// Thêm Dev Logging cho publicClient Response/Error
publicClient.interceptors.response.use(
    (response) => {
        if (DEV_LOG_ENABLED) {
            console.log(`[RES][PUBLIC] ${response.config.method?.toUpperCase()} ${response.config.url}\nStatus: ${response.status}\nBody: ${JSON.stringify(response.data)}`);
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

// --- PRIVATE CLIENT ---
export const privateClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    timeout: 30000,
});

// Thêm Auth Token và Dev Logging cho privateClient Request
privateClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const commonHeaders = await getCommonHeaders();
        config.headers = Object.assign({}, config.headers, commonHeaders);

        const { accessToken } = useTokenStore.getState();
        if (accessToken && !config.headers['Authorization']) {
            config.headers['Authorization'] = `Bearer ${accessToken}`;
        }

        if (DEV_LOG_ENABLED && config.data) {
            console.log(`[REQ][PRIVATE] ${config.method?.toUpperCase()} ${config.url}\nBody: ${JSON.stringify(config.data)}`);
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// --- INTERCEPTOR REFRESH TOKEN VÀ DEV LOGGING RESPONSE ---
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
        // Dev Logging cho Success
        if (DEV_LOG_ENABLED) {
            console.log(`[RES][PRIVATE] ${response.config.method?.toUpperCase()} ${response.config.url}\nStatus: ${response.status}\nBody: ${JSON.stringify(response.data)}`);
        }
        // Yêu cầu: request success thì kh cần hiển thị tin nhắn gì
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as CustomAxiosRequestConfig;
        const httpStatus = error.response?.status;

        // Dev Logging cho Error
        if (DEV_LOG_ENABLED) {
            const data = error.response?.data;
            const url = error.config?.url;
            console.error(`[ERR][PRIVATE] ${error.config?.method?.toUpperCase()} ${url}\nStatus: ${httpStatus}\nBody: ${JSON.stringify(data || error.message)}`);
        }

        // Xử lý hiển thị Toast theo logic mới (chỉ hiển thị nếu userFacing=true và không phải 401/403)
        if (httpStatus !== 401 && httpStatus !== 403) {
            handleErrorResponse(error);
        } else if (!httpStatus && error.message) {
            // Lỗi mạng hoặc timeout không có status code
            handleErrorResponse(error);
        }


        // Chỉ xử lý 401
        if (httpStatus !== 401 || originalRequest._retry) {
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
            // Sử dụng publicClient để tránh loop interceptor
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