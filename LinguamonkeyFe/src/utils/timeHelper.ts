import { Platform } from 'react-native';

function getSystemLocaleAndTimeZone() {
  const { locale, timeZone } = Intl.DateTimeFormat().resolvedOptions()
  return {
    locale: locale || "en-US",
    timeZone: timeZone || "UTC",
  }
}

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

export function formatDateTime(date?: Date | string | number, locale?: string, timeZone?: string) {
  const dateObj = date ? new Date(date) : new Date() // Nếu không truyền thì lấy luôn time hiện tại
  const { locale: sysLocale, timeZone: sysTimeZone } = getSystemLocaleAndTimeZone()

  return new Intl.DateTimeFormat(locale || sysLocale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timeZone || sysTimeZone,
    hour12: true,
  }).format(dateObj)
}

export function getGreetingTime(date?: Date | string | number, locale?: string, timeZone?: string, t?: (key: string) => string) {
  const dateObj = date ? new Date(date) : new Date()
  const { locale: sysLocale, timeZone: sysTimeZone } = getSystemLocaleAndTimeZone()

  const hour = new Intl.DateTimeFormat(locale || sysLocale, {
    hour: "numeric",
    timeZone: timeZone || sysTimeZone,
    hour12: false,         // 👈 luôn 0–23h
  })
    .formatToParts(dateObj)
    .find((part) => part.type === "hour")?.value

  const hourNum = Number.parseInt(hour || "0", 10)

  if (hourNum >= 0 && hourNum < 12) return t ? t("greeting.morning") : "Chào buổi sáng"
  if (hourNum >= 12 && hourNum < 17) return t ? t("greeting.afternoon") : "Chào buổi chiều"
  return t ? t("greeting.evening") : "Chào buổi tối"
}


export function formatShortTime(date?: Date | string | number, locale?: string, timeZone?: string) {
  const dateObj = date ? new Date(date) : new Date()
  const { locale: sysLocale, timeZone: sysTimeZone } = getSystemLocaleAndTimeZone()

  return new Intl.DateTimeFormat(locale || sysLocale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timeZone || sysTimeZone,
    hour12: true,
  }).format(dateObj)
}

export const formatDuration = (minutes: number): string => {
  if (!minutes || minutes === 0) return "0m"

  if (minutes < 60) return `${minutes}m`

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export const formatTimeAgo = (date: Date): string => {
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInMinutes < 1) {
    return "Just now"
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`
  } else if (diffInDays === 1) {
    return "Yesterday"
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`
  } else {
    return date.toLocaleDateString()
  }
}