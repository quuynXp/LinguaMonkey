import { useState, useEffect, useCallback } from 'react';
import { SupportedCurrency } from '../utils/currency';

interface ExchangeRateResponse {
    date: string;
    vnd: Record<string, number>;
}

interface UseCurrencyConverterResult {
    convert: (amountInVND: number, targetCurrency: SupportedCurrency) => number;
    rates: Record<string, number>;
    isLoading: boolean;
    error: string | null;
    lastUpdated: string | null;
}

const API_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/vnd.json';

export const useCurrencyConverter = (): UseCurrencyConverterResult => {
    const [rates, setRates] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    useEffect(() => {
        const fetchRates = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(API_URL);
                if (!response.ok) throw new Error('Failed to fetch exchange rates');

                const data: ExchangeRateResponse = await response.json();
                setRates(data.vnd);
                setLastUpdated(data.date);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchRates();
    }, []);

    const convert = useCallback((amountInVND: number, targetCurrency: SupportedCurrency): number => {
        if (targetCurrency === 'VND') return amountInVND;
        if (!rates[targetCurrency.toLowerCase()]) return amountInVND;

        return amountInVND * rates[targetCurrency.toLowerCase()];
    }, [rates]);

    return { convert, rates, isLoading, error, lastUpdated };
};