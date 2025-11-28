import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Alert, Switch } from 'react-native';
import { createScaledSheet } from '../../utils/scaledStyles';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../../stores/UserStore';
import { useCurrencyConverter } from '../../hooks/useCurrencyConverter';
import { useWallet } from '../../hooks/useWallet';
import { useTransactionsApi } from '../../hooks/useTransaction';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Enums from '../../types/enums';
import { TransactionRequest, PaymentRequest } from '../../types/dto';

interface VipUpgradeModalProps {
    visible: boolean;
    onClose: () => void;
}

const VipUpgradeModal: React.FC<VipUpgradeModalProps> = ({ visible, onClose }) => {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    const { user, registerVip } = useUserStore();

    // Hooks
    const { convert, isLoading: loadingRates } = useCurrencyConverter();
    const { data: walletData, isLoading: loadingBalance } = useWallet().useWalletBalance(user?.userId);
    const createTransaction = useTransactionsApi().useCreateTransaction();
    const createPaymentUrl = useTransactionsApi().useCreatePayment();

    // State
    const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');
    const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'gateway'>('gateway');
    const [isProcessing, setIsProcessing] = useState(false);

    // Pricing Constants
    const BASE_PRICE_MONTHLY = 9.99; // USD
    const BASE_PRICE_YEARLY = 99.00; // USD

    const isRenewal = user?.isVip ?? false;
    const currentPriceUSD = plan === 'monthly' ? BASE_PRICE_MONTHLY : BASE_PRICE_YEARLY;

    // Currency Logic
    const userCurrency = user?.country === Enums.Country.VIETNAM ? 'VND' : 'USD';
    const displayPrice = convert(currentPriceUSD * (userCurrency === 'VND' ? 25000 : 1), userCurrency); // Fallback rate if hook fails

    const handleConfirm = async () => {
        if (!user?.userId) return;
        setIsProcessing(true);

        try {
            if (paymentMethod === 'wallet') {
                await handleWalletPayment();
            } else {
                await handleGatewayPayment();
            }
        } catch (error) {
            console.error(error);
            Alert.alert(t('common.error'), t('payment.failed'));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleWalletPayment = async () => {
        const balance = walletData?.balance || 0;

        // 1. Kiểm tra số dư local (UX nhanh)
        if (balance < displayPrice) {
            Alert.alert(
                t('payment.insufficientBalanceTitle'),
                t('payment.insufficientBalanceMessage', { amount: (displayPrice - balance).toLocaleString() + ' ' + userCurrency }),
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                        text: t('payment.depositNow'),
                        onPress: () => {
                            onClose();
                            // Navigate to Deposit Screen with pre-filled amount needed
                            navigation.navigate('DepositScreen', { minAmount: displayPrice - balance });
                        }
                    }
                ]
            );
            return;
        }

        // 2. Gọi API Transaction (Backend sẽ kiểm tra lại số dư thực tế và trừ tiền)
        const payload: TransactionRequest = {
            userId: user!.userId,
            amount: displayPrice,
            provider: Enums.TransactionProvider.INTERNAL,
            status: Enums.TransactionStatus.SUCCESS,
            description: `${isRenewal ? 'Renew' : 'Upgrade'} VIP (${plan})`,
        };

        createTransaction.mutate(payload, {
            onSuccess: async () => {
                // 3. Nếu trừ tiền thành công, kích hoạt VIP
                // Gọi hàm giả lập registerVip hoặc refresh profile để update trạng thái user
                Alert.alert("Success", t('vip.successMessage'));
                onClose();
                // Force refresh user profile here if needed
            },
            onError: (err) => {
                Alert.alert(t('common.error'), t('payment.transactionFailed'));
            }
        });
    };

    const handleGatewayPayment = async () => {
        const payload: PaymentRequest = {
            userId: user!.userId,
            amount: displayPrice,
            currency: userCurrency,
            provider: Enums.TransactionProvider.STRIPE, // Hoặc VNPAY tuỳ logic
            returnUrl: "linguamonkey://vip-success",
            description: `${isRenewal ? 'Renew' : 'Upgrade'} VIP (${plan})`,
        };

        createPaymentUrl.mutate(payload, {
            onSuccess: async (url) => {
                if (url) {
                    onClose();
                    await WebBrowser.openBrowserAsync(url);
                }
            },
            onError: () => Alert.alert(t('common.error'), t('payment.gatewayError'))
        });
    };

    return (
        <Modal
            transparent
            animationType="slide"
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Icon name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>

                    {/* Header Icon */}
                    <View style={styles.iconContainer}>
                        <Icon name={isRenewal ? "autorenew" : "workspace-premium"} size={60} color="#F59E0B" />
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>
                        {isRenewal ? t('vip.renewTitle', 'Gia hạn VIP') : t('vip.upgradeTitle', 'Nâng cấp VIP')}
                    </Text>
                    <Text style={styles.subtitle}>
                        {t('vip.upgradeDesc', 'Mở khóa toàn bộ bài thi thử TOEIC, IELTS, các kỹ năng Nghe, Nói, Đọc, Viết không giới hạn.')}
                    </Text>

                    {/* Plan Selection */}
                    <View style={styles.planSelector}>
                        <TouchableOpacity
                            style={[styles.planOption, plan === 'monthly' && styles.planOptionSelected]}
                            onPress={() => setPlan('monthly')}
                        >
                            <Text style={[styles.planText, plan === 'monthly' && styles.planTextSelected]}>{t('vip.monthly', '1 Tháng')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.planOption, plan === 'yearly' && styles.planOptionSelected]}
                            onPress={() => setPlan('yearly')}
                        >
                            <Text style={[styles.planText, plan === 'yearly' && styles.planTextSelected]}>{t('vip.yearly', '1 Năm')}</Text>
                            <View style={styles.saveBadge}>
                                <Text style={styles.saveText}>SAVE 17%</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Price Display */}
                    <View style={styles.priceContainer}>
                        {loadingRates ? (
                            <ActivityIndicator color="#4F46E5" />
                        ) : (
                            <>
                                <Text style={styles.priceLabel}>{t('vip.price', 'Chỉ với')}</Text>
                                <Text style={styles.priceValue}>
                                    {displayPrice.toLocaleString()} {userCurrency}
                                </Text>
                                <Text style={styles.pricePeriod}>/ {plan === 'monthly' ? t('common.month') : t('common.year')}</Text>
                            </>
                        )}
                    </View>

                    {/* Payment Method Toggle */}
                    <View style={styles.methodContainer}>
                        <Text style={styles.methodLabel}>{t('payment.method')}:</Text>
                        <View style={styles.methodRow}>
                            <TouchableOpacity
                                style={[styles.methodBtn, paymentMethod === 'wallet' && styles.methodBtnSelected]}
                                onPress={() => setPaymentMethod('wallet')}
                            >
                                <Icon name="account-balance-wallet" size={20} color={paymentMethod === 'wallet' ? '#FFF' : '#6B7280'} />
                                <Text style={[styles.methodText, paymentMethod === 'wallet' && styles.methodTextSelected]}>{t('payment.wallet')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.methodBtn, paymentMethod === 'gateway' && styles.methodBtnSelected]}
                                onPress={() => setPaymentMethod('gateway')}
                            >
                                <Icon name="credit-card" size={20} color={paymentMethod === 'gateway' ? '#FFF' : '#6B7280'} />
                                <Text style={[styles.methodText, paymentMethod === 'gateway' && styles.methodTextSelected]}>{t('payment.card')}</Text>
                            </TouchableOpacity>
                        </View>
                        {paymentMethod === 'wallet' && (
                            <Text style={styles.balanceHint}>
                                {t('payment.available')}: {loadingBalance ? '...' : walletData?.balance.toLocaleString()} {userCurrency}
                            </Text>
                        )}
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity
                        style={[styles.confirmButton, isProcessing && styles.disabledButton]}
                        onPress={handleConfirm}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.confirmButtonText}>
                                {isRenewal ? t('vip.renewNow', 'Gia hạn ngay') : t('vip.buyNow', 'Đăng ký ngay')}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = createScaledSheet({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 4,
        zIndex: 10,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 18,
    },
    planSelector: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
        width: '100%',
    },
    planOption: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
        position: 'relative',
    },
    planOptionSelected: {
        backgroundColor: '#FFF',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    planText: {
        fontWeight: '600',
        color: '#6B7280',
    },
    planTextSelected: {
        color: '#4F46E5',
    },
    saveBadge: {
        position: 'absolute',
        top: -8,
        right: -4,
        backgroundColor: '#EF4444',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    saveText: {
        color: '#FFF',
        fontSize: 8,
        fontWeight: 'bold',
    },
    priceContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    priceLabel: {
        fontSize: 12,
        color: '#6B7280',
    },
    priceValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#4F46E5',
        marginVertical: 4,
    },
    pricePeriod: {
        fontSize: 12,
        color: '#6B7280',
    },
    methodContainer: {
        width: '100%',
        marginBottom: 24,
    },
    methodLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    methodRow: {
        flexDirection: 'row',
        gap: 12,
    },
    methodBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        gap: 6,
    },
    methodBtnSelected: {
        backgroundColor: '#4F46E5',
        borderColor: '#4F46E5',
    },
    methodText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    methodTextSelected: {
        color: '#FFF',
    },
    balanceHint: {
        marginTop: 6,
        fontSize: 12,
        color: '#10B981',
        textAlign: 'right',
    },
    confirmButton: {
        width: '100%',
        backgroundColor: '#4F46E5',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#9CA3AF',
    },
    confirmButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default VipUpgradeModal;