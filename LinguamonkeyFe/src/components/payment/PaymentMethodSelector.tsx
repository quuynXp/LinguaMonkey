import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { createScaledSheet } from '../../utils/scaledStyles';
import * as Enums from '../../types/enums';

interface PaymentMethodSelectorProps {
    selectedMethod?: 'wallet' | 'gateway';
    selectedProvider: Enums.TransactionProvider;
    onMethodChange?: (method: 'wallet' | 'gateway') => void;
    onProviderChange: (provider: Enums.TransactionProvider) => void;
    walletBalance?: number;
    currency?: string;
    showWalletOption?: boolean;
    insufficientBalance?: boolean;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
    selectedMethod = 'gateway',
    selectedProvider,
    onMethodChange,
    onProviderChange,
    walletBalance = 0,
    currency = 'USD',
    showWalletOption = false,
    insufficientBalance = false,
}) => {
    const { t } = useTranslation();

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>{t('payment.selectMethod')}</Text>

            {/* Wallet Option */}
            {showWalletOption && (
                <TouchableOpacity
                    style={[styles.methodCard, selectedMethod === 'wallet' && styles.selectedMethod]}
                    onPress={() => onMethodChange?.('wallet')}
                >
                    <View style={styles.methodHeader}>
                        <Icon name="account-balance-wallet" size={24} color="#4F46E5" />
                        <Text style={styles.methodTitle}>{t('payment.myWallet')}</Text>
                        {selectedMethod === 'wallet' && <Icon name="check-circle" size={20} color="#4F46E5" />}
                    </View>
                    <Text style={styles.balanceText}>
                        {t('payment.available')}: {walletBalance.toLocaleString()} {currency}
                    </Text>
                    {insufficientBalance && (
                        <Text style={styles.errorText}>{t('payment.insufficientWarning')}</Text>
                    )}
                </TouchableOpacity>
            )}

            {/* Gateway Option */}
            <TouchableOpacity
                style={[styles.methodCard, selectedMethod === 'gateway' && styles.selectedMethod]}
                onPress={() => onMethodChange?.('gateway')}
            >
                <View style={styles.methodHeader}>
                    <Icon name="public" size={24} color="#10B981" />
                    <Text style={styles.methodTitle}>{t('payment.externalGateway')}</Text>
                    {selectedMethod === 'gateway' && <Icon name="check-circle" size={20} color="#10B981" />}
                </View>

                {/* Provider List - Only show if gateway is selected or wallet option is hidden (defaulting to gateway) */}
                {(selectedMethod === 'gateway' || !showWalletOption) && (
                    <View style={styles.gatewayOptions}>

                        {/* VNPAY */}
                        <TouchableOpacity
                            style={[
                                styles.providerBtn,
                                selectedProvider === Enums.TransactionProvider.VNPAY && styles.providerBtnSelected
                            ]}
                            onPress={() => onProviderChange(Enums.TransactionProvider.VNPAY)}
                        >
                            <Icon name="qr-code" size={20} color={selectedProvider === Enums.TransactionProvider.VNPAY ? '#FFF' : '#005BAA'} />
                            <Text style={[styles.providerText, selectedProvider === Enums.TransactionProvider.VNPAY && styles.providerTextSelected]}>
                                VNPAY
                            </Text>
                        </TouchableOpacity>

                        {/* STRIPE */}
                        <TouchableOpacity
                            style={[
                                styles.providerBtn,
                                selectedProvider === Enums.TransactionProvider.STRIPE && styles.providerBtnSelected
                            ]}
                            onPress={() => onProviderChange(Enums.TransactionProvider.STRIPE)}
                        >
                            <Icon name="credit-card" size={20} color={selectedProvider === Enums.TransactionProvider.STRIPE ? '#FFF' : '#635BFF'} />
                            <Text style={[styles.providerText, selectedProvider === Enums.TransactionProvider.STRIPE && styles.providerTextSelected]}>
                                Visa/Master
                            </Text>
                        </TouchableOpacity>

                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = createScaledSheet({
    container: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 12 },
    methodCard: { backgroundColor: "#FFF", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 12 },
    selectedMethod: { borderColor: "#4F46E5", backgroundColor: "#EEF2FF" },
    methodHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
    methodTitle: { fontSize: 16, fontWeight: "500", flex: 1, color: "#1F2937" },
    balanceText: { marginLeft: 36, marginTop: 4, fontSize: 14, color: "#6B7280" },
    errorText: { marginLeft: 36, marginTop: 4, fontSize: 12, color: "#EF4444" },
    gatewayOptions: { marginTop: 16, marginLeft: 36, gap: 10 },

    providerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: 'transparent',
        gap: 10
    },
    providerBtnSelected: {
        backgroundColor: '#4F46E5',
        borderColor: '#4F46E5'
    },
    providerText: { fontSize: 14, fontWeight: '500', color: '#374151' },
    providerTextSelected: { color: '#FFF' }
});

export default PaymentMethodSelector;