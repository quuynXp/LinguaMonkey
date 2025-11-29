import React from 'react';
import CountryFlag from "react-native-country-flag";

const LANGUAGE_CODE_TO_COUNTRY_CODE: Record<string, string> = {
    en: "us",
    vi: "vn",
    ja: "jp",
    zh: "cn",
    fr: "fr",
    de: "de",
    it: "it",
    es: "es",
    ko: "kr",
    hi: "in",
};

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
    "UNITED STATES": "us",
    "UNITED_STATES": "us",
    USA: "us",
    US: "us",

    VIETNAM: "vn",
    "VIET NAM": "vn",
    VN: "vn",

    JAPAN: "jp",
    JP: "jp",

    CHINA: "cn",
    CN: "cn",

    FRANCE: "fr",
    FR: "fr",

    GERMANY: "de",
    DE: "de",

    ITALY: "it",
    IT: "it",

    SPAIN: "es",
    ES: "es",

    KOREA: "kr",
    "SOUTH KOREA": "kr",
    "SOUTH_KOREA": "kr",
    KR: "kr",

    INDIA: "in",
    IN: "in",
};

const normalizeCountry = (countryOrLangCode?: string): string | null => {
    if (!countryOrLangCode) return null;
    const key = countryOrLangCode.trim().toLowerCase();

    // 1. Check if it's a direct 2-letter country code (already lowercased)
    if (key.length === 2 && COUNTRY_NAME_TO_CODE[key.toUpperCase()]) {
        return key;
    }

    // 2. Check if it's a language code (e.g., 'en', 'vi')
    if (LANGUAGE_CODE_TO_COUNTRY_CODE[key]) {
        return LANGUAGE_CODE_TO_COUNTRY_CODE[key];
    }

    // 3. Check if it's a country name (normalize to upper case for lookup)
    const upperKey = countryOrLangCode.trim().toUpperCase().replace(/-/g, '_');
    return COUNTRY_NAME_TO_CODE[upperKey] || COUNTRY_NAME_TO_CODE[upperKey.replace(/_/g, ' ')] || null;
};

/** Return JSX flag component */
export const getCountryFlag = (countryOrLangCode?: string, size = 24) => {
    const code = normalizeCountry(countryOrLangCode);
    if (!code) return null;
    return <CountryFlag isoCode={code} size={size} />;
};