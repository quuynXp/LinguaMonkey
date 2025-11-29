import { useState, useEffect, useCallback } from 'react';
import { SupportedCurrency } from '../utils/currency';

interface ExchangeRateResponse {
    date: string;
    usd: Record<string, number>; // Sửa từ vnd -> usd
}

interface UseCurrencyConverterResult {
    convert: (amountInUSD: number, targetCurrency: SupportedCurrency) => number;
    rates: Record<string, number>;
    isLoading: boolean;
    error: string | null;
    lastUpdated: string | null;
}

// ĐỔI API SANG USD BASE
const API_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';

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
                setRates(data.usd); // Lấy data.usd
                setLastUpdated(data.date);
                setError(null);
            } catch (err) {
                console.error("Currency fetch error:", err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchRates();
    }, []);

    // Hàm này nhận vào tiền USD và đổi ra tiền target
    const convert = useCallback((amountInUSD: number, targetCurrency: SupportedCurrency): number => {
        // Nếu target là USD thì trả về nguyên bản
        if (targetCurrency === 'USD') return amountInUSD;

        const targetKey = targetCurrency.toLowerCase();

        // Nếu chưa load xong rate hoặc không tìm thấy rate, dùng hardcode fallback cho VND để UI không bị ngáo 0 đồng
        if (!rates[targetKey]) {
            if (targetCurrency === 'VND') return amountInUSD * 25400; // Fallback rate
            return amountInUSD;
        }

        return amountInUSD * rates[targetKey];
    }, [rates]);

    return { convert, rates, isLoading, error, lastUpdated };
};