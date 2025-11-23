import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CURRENCY_CONFIG, SupportedCurrency } from '../utils/currency';
import { useCurrencyConverter } from '../hooks/useCurrencyConverter';
import { formatCurrency } from '../utils/formatCurrency';

interface Props {
    amountInVnd: number;
}

export const CurrencySelector: React.FC<Props> = ({ amountInVnd }) => {
    const { t } = useTranslation();
    const { convert, isLoading, error } = useCurrencyConverter();
    const [selectedKey, setSelectedKey] = useState<string>('VI');

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedKey(e.target.value);
    };

    const currentConfig = CURRENCY_CONFIG[selectedKey];
    const convertedAmount = convert(amountInVnd, currentConfig.code);

    if (error) return <span className="text-red-500">{t('anErrorOccurred')}</span>;

    return (
        <div className="flex flex-col gap-2 p-4 border rounded-lg bg-white shadow-sm">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                    {t('currency.select')}
                </label>
                <select
                    value={selectedKey}
                    onChange={handleCurrencyChange}
                    className="p-2 border rounded-md text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                >
                    {Object.entries(CURRENCY_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>
                            {config.flag} {config.code} - {t(`currency.${config.code}`)}
                        </option>
                    ))}
                </select>
            </div>

            <div className="mt-2 text-right">
                {isLoading ? (
                    <span className="text-gray-400 text-sm">{t('common.loading')}</span>
                ) : (
                    <span className="text-xl font-bold text-blue-600">
                        {formatCurrency(convertedAmount, currentConfig.code, currentConfig.locale)}
                    </span>
                )}
            </div>
        </div>
    );
};