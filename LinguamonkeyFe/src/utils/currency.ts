export const formatCurrency = (amount: number, currency = 'VND') => {
    if (typeof amount !== 'number' || isNaN(amount)) return '0 đ';

    if (currency === 'VND') {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0,
        }).format(amount);
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(amount);
};