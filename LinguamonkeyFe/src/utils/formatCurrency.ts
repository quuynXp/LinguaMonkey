import { CURRENCY_CONFIG, SupportedCurrency } from './currency';

export const formatCurrency = (amount: number, currencyCode: SupportedCurrency = 'VND', localeOverride?: string): string => {
    if (typeof amount !== 'number' || isNaN(amount)) return '0';

    const config = Object.values(CURRENCY_CONFIG).find((c) => c.code === currencyCode) || CURRENCY_CONFIG.VI;
    const locale = localeOverride || config.locale;

    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: config.fractionDigits,
            maximumFractionDigits: config.fractionDigits,
        }).format(amount);
    } catch (error) {
        return `${amount} ${currencyCode}`;
    }
};