import 'axios';

declare module 'axios' {
    export interface InternalAxiosRequestConfig {
        /**
         * Số lần request này đã được thử lại do lỗi mạng/timeout.
         */
        _retryCount?: number;
        /**
         * Số lần request này đã được thử lại do lỗi 401 (refresh token).
         */
        _refreshRetryCount?: number;
    }
}