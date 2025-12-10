import { Platform } from 'react-native';

/**
 * Handles time conversion between User's Local Device Time and Vietnam Standard Time (UTC+7).
 * The Backend expects 'HH:mm' string and treats it as UTC+7.
 */
export const TimeHelper = {
    /**
     * Converts a local Date object to a 'HH:mm' string representing Vietnam Time (UTC+7).
     * Example: User is in Japan (UTC+9) and selects 10:00 AM.
     * Result sent to BE: "08:00" (which is 10:00 AM Japan time in VN time).
     */
    convertToVietnamTime: (localDate: Date): string => {
        // Get current local time in milliseconds
        const localTime = localDate.getTime();

        // Get local timezone offset in minutes (e.g., -540 for Japan) and convert to ms
        const localOffset = localDate.getTimezoneOffset() * 60000;

        // Calculate UTC time
        const utcTime = localTime + localOffset;

        // Vietnam is UTC+7 (7 hours * 60 min * 60 sec * 1000 ms)
        const vietNamOffset = 7 * 60 * 60 * 1000;

        // Create new Date object for Vietnam Time
        const vnDate = new Date(utcTime + vietNamOffset);

        // Format to HH:mm
        const hours = vnDate.getHours().toString().padStart(2, '0');
        const minutes = vnDate.getMinutes().toString().padStart(2, '0');

        return `${hours}:${minutes}`;
    },

    /**
     * Format a Date object to YYYY-MM-DD for API
     */
    formatDateForApi: (date: Date): string => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
};