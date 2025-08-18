// timeHelper.ts
function getSystemLocaleAndTimeZone() {
  const { locale, timeZone } = Intl.DateTimeFormat().resolvedOptions();
  return {
    locale: locale || "en-US",
    timeZone: timeZone || "UTC",
  };
}

export function formatDateTime(
  date?: Date | string | number,
  locale?: string,
  timeZone?: string
) {
  const dateObj = date ? new Date(date) : new Date(); // Nếu không truyền thì lấy luôn time hiện tại
  const { locale: sysLocale, timeZone: sysTimeZone } = getSystemLocaleAndTimeZone();

  return new Intl.DateTimeFormat(locale || sysLocale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timeZone || sysTimeZone,
    hour12: true,
  }).format(dateObj);
}

export function getGreetingTime(
  date?: Date | string | number,
  locale?: string,
  timeZone?: string
) {
  const dateObj = date ? new Date(date) : new Date();
  const { locale: sysLocale, timeZone: sysTimeZone } = getSystemLocaleAndTimeZone();

  const hour = new Intl.DateTimeFormat(locale || sysLocale, {
    hour: "numeric",
    timeZone: timeZone || sysTimeZone,
  })
    .formatToParts(dateObj)
    .find((part) => part.type === "hour")?.value;

  const hourNum = parseInt(hour || "0", 10);

  if (hourNum >= 0 && hourNum < 12) return "Chào buổi sáng";
  if (hourNum >= 12 && hourNum < 17) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export function formatShortTime(
  date?: Date | string | number,
  locale?: string,
  timeZone?: string
) {
  const dateObj = date ? new Date(date) : new Date();
  const { locale: sysLocale, timeZone: sysTimeZone } = getSystemLocaleAndTimeZone();

  return new Intl.DateTimeFormat(locale || sysLocale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timeZone || sysTimeZone,
    hour12: true,
  }).format(dateObj);
}