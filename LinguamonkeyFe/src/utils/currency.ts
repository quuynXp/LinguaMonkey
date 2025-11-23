export type SupportedCurrency = 'VND' | 'USD' | 'CNY' | 'JPY' | 'KRW' | 'EUR';

export interface CurrencyConfig {
    code: SupportedCurrency;
    locale: string;
    flag: string;
    fractionDigits: number;
}

export const CURRENCY_CONFIG: Record<string, CurrencyConfig> = {
    VI: { code: 'VND', locale: 'vi-VN', flag: '🇻🇳', fractionDigits: 0 },
    EN: { code: 'USD', locale: 'en-US', flag: '🇺🇸', fractionDigits: 2 },
    ZH: { code: 'CNY', locale: 'zh-CN', flag: '🇨🇳', fractionDigits: 2 },
    JA: { code: 'JPY', locale: 'ja-JP', flag: '🇯🇵', fractionDigits: 0 },
    KO: { code: 'KRW', locale: 'ko-KR', flag: '🇰🇷', fractionDigits: 0 },
    FR: { code: 'EUR', locale: 'fr-FR', flag: '🇫🇷', fractionDigits: 2 },
    ES: { code: 'EUR', locale: 'es-ES', flag: '🇪🇸', fractionDigits: 2 },
};

export const SUPPORTED_CURRENCIES = Object.values(CURRENCY_CONFIG);