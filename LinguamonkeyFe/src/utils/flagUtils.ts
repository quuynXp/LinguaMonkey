const FLAG_OFFSET = 127397;
const ASCII_OFFSET = 65;
const COUNTRY_CODE_LENGTH = 2;

const COUNTRY_CODE_MAP: { [key: string]: string } = {
    CHINA: 'CN',
    TONGA: 'TO',
    VIETNAM: 'VN',
    KOREA: 'KR', 
    JAPAN: 'JP',
    UNITED_STATES: 'US',
    FRANCE: 'FR',
    GERMANY: 'DE',
    ICELAND: 'IS',
    ITALY: 'IT',
    SPAIN: 'ES',
    SOUTH_KOREA: 'KR',
    INDIA: 'IN',
    US: 'US',
    JP: 'JP',
    KR: 'KR',
    TO: 'TO',
};

/**
 * Chuyển đổi mã quốc gia (có thể là tên dài, mã 2 ký tự, hoặc mã không chuẩn) thành emoji cờ.
 * @param countryInput Mã quốc gia (ví dụ: 'VIETNAM', 'US', 'VN')
 * @returns Emoji cờ chuẩn (ví dụ: '🇻🇳', '🇺🇸') hoặc '🌍' nếu không tìm thấy.
 */
export const getFlagEmoji = (countryInput: string | null | undefined): string => {
    if (!countryInput) return "🌍";

    const normalizedInput = countryInput.toUpperCase().trim();
    let countryCode: string | null = null;

    if (normalizedInput.length === COUNTRY_CODE_LENGTH) {
        countryCode = normalizedInput;
    } else {
        countryCode = COUNTRY_CODE_MAP[normalizedInput];
    }

    if (!countryCode) {
        return "🌍";
    }

    const codePoints = countryCode
        .split("")
        .map((char) => FLAG_OFFSET + (char.charCodeAt(0) - ASCII_OFFSET));

    if (codePoints.some(isNaN)) {
        return "🌍";
    }

    return String.fromCodePoint(...codePoints);
};