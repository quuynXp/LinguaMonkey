import React, { useState, useEffect, useMemo } from 'react';
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
    const { user } = useUserStore();

    const { convert, rates, isLoading: loadingRates } = useCurrencyConverter();
    const { data: walletData, isLoading: loadingBalance } = useWallet().useWalletBalance(user?.userId);
    const createTransaction = useTransactionsApi().useCreateTransaction();
    const createPaymentUrl = useTransactionsApi().useCreatePayment();

    const [plan, setPlan] = useState<'monthly' | 'yearly' | 'trial'>('yearly');
    const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'gateway'>('gateway');
    const [gatewayProvider, setGatewayProvider] = useState<Enums.TransactionProvider>(Enums.TransactionProvider.STRIPE);
    const [isProcessing, setIsProcessing] = useState(false);

    const [useCoins, setUseCoins] = useState(false);
    const [coinsToUse, setCoinsToUse] = useState(0);

    const BASE_PRICE_MONTHLY = 9.99;
    const BASE_PRICE_YEARLY = 99.00;
    const PRICE_TRIAL = 1.00;
    const COINS_PER_USD = 1000;

    const isRenewal = user?.vip ?? false;
    const isTrialEligible = !user?.vip;

    useEffect(() => {
        if (isTrialEligible && !isRenewal) {
            setPlan('trial');
        } else {
            setPlan('yearly');
        }
    }, [isTrialEligible, isRenewal, visible]);

    let currentPriceUSD = 0;
    if (plan === 'monthly') currentPriceUSD = BASE_PRICE_MONTHLY;
    else if (plan === 'yearly') currentPriceUSD = BASE_PRICE_YEARLY;
    else if (plan === 'trial') currentPriceUSD = PRICE_TRIAL;

    const userCurrency = user?.country === Enums.Country.VIETNAM ? 'VND' : 'USD';
    const availableCoins = user?.coins || 0;

    const maxCoinsUsable = useMemo(() => {
        if (plan === 'trial') return 0;
        const priceInCoins = currentPriceUSD * COINS_PER_USD;
        return Math.floor(Math.min(availableCoins, priceInCoins));
    }, [availableCoins, currentPriceUSD, plan]);

    useEffect(() => {
        if (plan === 'trial') {
            setUseCoins(false);
            setCoinsToUse(0);
        } else if (useCoins) {
            setCoinsToUse(maxCoinsUsable);
        } else {
            setCoinsToUse(0);
        }
    }, [useCoins, plan, maxCoinsUsable]);

    const discountUSD = coinsToUse / COINS_PER_USD;
    const finalPriceUSD = Math.max(0, currentPriceUSD - discountUSD);
    const displayPrice = convert(finalPriceUSD, userCurrency);

    const getBalanceInUSD = () => {
        const balance = walletData?.balance || 0;
        if (userCurrency === 'USD') return '';
        const rate = convert(1, 'VND');
        if (!rate || rate === 0) return '';
        const balanceUSD = balance / rate;
        return `(≈ $${balanceUSD.toFixed(2)})`;
    };

    const getDescription = () => {
        if (plan === 'trial') return "Upgrade VIP (Trial 14 Days)";
        return `${isRenewal ? 'Renew' : 'Upgrade'} VIP (${plan})`;
    }

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
                            navigation.navigate('DepositScreen', { minAmount: displayPrice - balance });
                        }
                    }
                ]
            );
            return;
        }

        const cleanAmount = Number(displayPrice.toFixed(2));
        const payload: TransactionRequest = {
            userId: user!.userId,
            amount: cleanAmount,
            currency: userCurrency,
            provider: Enums.TransactionProvider.INTERNAL,
            type: Enums.TransactionType.UPGRADE_VIP, // FIXED: Correct Enum Type
            status: Enums.TransactionStatus.SUCCESS,
            description: getDescription(),
            coins: useCoins ? coinsToUse : 0,
            // receiverId and courseVersionId are OPTIONAL now
        };

        createTransaction.mutate(payload, {
            onSuccess: async () => {
                Alert.alert("Success", "VIP activated successfully!");
                onClose();
            },
            onError: (err: any) => {
                console.log("Transaction Error", err?.response?.data || err);
                Alert.alert(t('common.error'), t('payment.transactionFailed'));
            }
        });
    };

    const handleGatewayPayment = async () => {
        const cleanAmount = Number(displayPrice.toFixed(2));

        const payload: PaymentRequest & { coins?: number; type?: string } = {
            userId: user!.userId,
            amount: cleanAmount,
            currency: userCurrency,
            provider: gatewayProvider,
            type: Enums.TransactionType.UPGRADE_VIP, // FIXED: Correct Enum Type
            returnUrl: "linguamonkey://vip-success",
            description: getDescription(),
            coins: useCoins ? coinsToUse : 0
        };

        createPaymentUrl.mutate(payload, {
            onSuccess: async (url) => {
                if (url) {
                    onClose();
                    await WebBrowser.openBrowserAsync(url);
                }
            },
            onError: (err: any) => {
                console.log("Gateway Error", err?.response?.data);
                Alert.alert(t('common.error'), t('payment.gatewayError'));
            }
        });
    };

    const increaseCoins = () => {
        if (coinsToUse + 100 <= maxCoinsUsable) setCoinsToUse(prev => prev + 100);
        else setCoinsToUse(maxCoinsUsable);
    };

    const decreaseCoins = () => {
        if (coinsToUse - 100 >= 0) setCoinsToUse(prev => prev - 100);
        else setCoinsToUse(0);
    };

    return (
        <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Icon name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>

                    <View style={styles.headerRow}>
                        <View style={styles.iconContainer}>
                            <Icon name={isRenewal ? "autorenew" : "workspace-premium"} size={40} color="#F59E0B" />
                        </View>
                        <View>
                            <Text style={styles.title}>
                                {isRenewal ? t('vip.renewTitle', 'Gia hạn VIP') : t('vip.upgradeTitle', 'Nâng cấp VIP')}
                            </Text>
                            <Text style={styles.subtitle}>Unlock Unlimited Features</Text>
                        </View>
                    </View>

                    {isTrialEligible && plan === 'trial' && (
                        <View style={styles.trialBanner}>
                            <Text style={styles.trialBannerText}>🎉 Special Offer: 14 Days Trial for $1!</Text>
                        </View>
                    )}

                    <View style={styles.planSelector}>
                        {isTrialEligible && (
                            <TouchableOpacity
                                style={[styles.planOption, plan === 'trial' && styles.planOptionSelected]}
                                onPress={() => setPlan('trial')}
                            >
                                <Text style={[styles.planText, plan === 'trial' && styles.planTextSelected]}>Trial</Text>
                                <Text style={{ fontSize: 9, color: plan === 'trial' ? '#4F46E5' : '#9CA3AF' }}>14 Days</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.planOption, plan === 'monthly' && styles.planOptionSelected]}
                            onPress={() => setPlan('monthly')}
                        >
                            <Text style={[styles.planText, plan === 'monthly' && styles.planTextSelected]}>Monthly</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.planOption, plan === 'yearly' && styles.planOptionSelected]}
                            onPress={() => setPlan('yearly')}
                        >
                            <Text style={[styles.planText, plan === 'yearly' && styles.planTextSelected]}>Yearly</Text>
                            <View style={styles.saveBadge}><Text style={styles.saveText}>-17%</Text></View>
                        </TouchableOpacity>
                    </View>

                    {plan !== 'trial' && (
                        <View style={styles.coinSection}>
                            <View style={styles.coinHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Icon name="monetization-on" size={20} color="#F59E0B" />
                                    <Text style={styles.coinLabel}>Coins ({availableCoins})</Text>
                                </View>
                                <Switch
                                    value={useCoins}
                                    onValueChange={setUseCoins}
                                    trackColor={{ false: "#D1D5DB", true: "#FBBF24" }}
                                    thumbColor={useCoins ? "#F59E0B" : "#F4F3F4"}
                                />
                            </View>
                            {useCoins && (
                                <View style={styles.coinControls}>
                                    <TouchableOpacity onPress={decreaseCoins} style={styles.coinBtn}><Icon name="remove" size={16} color="#6B7280" /></TouchableOpacity>
                                    <Text style={styles.coinValue}>{coinsToUse}</Text>
                                    <TouchableOpacity onPress={increaseCoins} style={styles.coinBtn}><Icon name="add" size={16} color="#6B7280" /></TouchableOpacity>
                                    <Text style={styles.discountText}>- ${(coinsToUse / COINS_PER_USD).toFixed(2)}</Text>
                                </View>
                            )}
                        </View>
                    )}

                    <View style={styles.priceContainer}>
                        {loadingRates ? <ActivityIndicator color="#4F46E5" /> : (
                            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                                <Text style={styles.priceLabel}>{t('vip.price', 'Total:')}</Text>
                                <Text style={styles.priceValue}>
                                    {displayPrice.toLocaleString()} {userCurrency}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.methodsContainer}>
                        <Text style={styles.sectionTitle}>{t('payment.selectMethod')}</Text>

                        <TouchableOpacity
                            style={[styles.methodCard, paymentMethod === 'wallet' && styles.selectedMethod]}
                            onPress={() => setPaymentMethod('wallet')}
                        >
                            <View style={styles.methodHeader}>
                                <Icon name="account-balance-wallet" size={24} color={paymentMethod === 'wallet' ? '#4F46E5' : '#6B7280'} />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.methodTitle, paymentMethod === 'wallet' && styles.selectedMethodText]}>{t('payment.myWallet')}</Text>
                                    <Text style={styles.balanceText}>
                                        {t('payment.available')}: {loadingBalance ? '...' : walletData?.balance.toLocaleString()} {userCurrency} {getBalanceInUSD()}
                                    </Text>
                                    {paymentMethod === 'wallet' && (walletData?.balance || 0) < displayPrice && (
                                        <Text style={styles.errorText}>{t('payment.insufficientWarning', 'Không đủ số dư')}</Text>
                                    )}
                                </View>
                                {paymentMethod === 'wallet' && <Icon name="check-circle" size={20} color="#4F46E5" />}
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.methodCard, paymentMethod === 'gateway' && styles.selectedMethod]}
                            onPress={() => setPaymentMethod('gateway')}
                        >
                            <View style={styles.methodHeader}>
                                <Icon name="credit-card" size={24} color={paymentMethod === 'gateway' ? '#4F46E5' : '#6B7280'} />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.methodTitle, paymentMethod === 'gateway' && styles.selectedMethodText]}>{t('payment.externalGateway', 'Cổng thanh toán')}</Text>
                                </View>
                                {paymentMethod === 'gateway' && <Icon name="check-circle" size={20} color="#4F46E5" />}
                            </View>

                            {paymentMethod === 'gateway' && (
                                <View style={styles.gatewayOptions}>
                                    <TouchableOpacity
                                        style={[styles.chip, gatewayProvider === Enums.TransactionProvider.STRIPE && styles.selectedChip]}
                                        onPress={() => setGatewayProvider(Enums.TransactionProvider.STRIPE)}
                                    >
                                        <Text style={[styles.chipText, gatewayProvider === Enums.TransactionProvider.STRIPE && styles.selectedChipText]}>Stripe (Visa/Master)</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.chip, gatewayProvider === Enums.TransactionProvider.VNPAY && styles.selectedChip]}
                                        onPress={() => setGatewayProvider(Enums.TransactionProvider.VNPAY)}
                                    >
                                        <Text style={[styles.chipText, gatewayProvider === Enums.TransactionProvider.VNPAY && styles.selectedChipText]}>VNPAY</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.confirmButton, isProcessing && styles.disabledButton]}
                        onPress={handleConfirm}
                        disabled={isProcessing}
                    >
                        {isProcessing ? <ActivityIndicator color="#FFF" /> : (
                            <Text style={styles.confirmButtonText}>
                                {plan === 'trial' ? 'Start Trial Now' : (paymentMethod === 'wallet' ? t('vip.buyNow') : t('payment.continueToGateway'))}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = createScaledSheet({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
    container: { width: '100%', backgroundColor: 'white', borderRadius: 24, padding: 20, elevation: 8 },
    closeButton: { position: 'absolute', top: 16, right: 16, padding: 4, zIndex: 10 },

    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
    iconContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
    subtitle: { fontSize: 13, color: '#6B7280' },

    trialBanner: { backgroundColor: '#EEF2FF', padding: 8, borderRadius: 8, marginBottom: 16, width: '100%', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#4F46E5' },
    trialBannerText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 12 },

    planSelector: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 16, width: '100%' },
    planOption: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
    planOptionSelected: { backgroundColor: '#FFF', elevation: 2 },
    planText: { fontWeight: '600', color: '#6B7280', fontSize: 13 },
    planTextSelected: { color: '#4F46E5' },
    saveBadge: { position: 'absolute', top: -6, right: -4, backgroundColor: '#EF4444', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 6 },
    saveText: { color: '#FFF', fontSize: 7, fontWeight: 'bold' },

    coinSection: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
    coinHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    coinLabel: { marginLeft: 8, fontSize: 13, fontWeight: '600', color: '#4B5563' },
    coinControls: { flexDirection: 'row', alignItems: 'center', marginTop: 8, justifyContent: 'space-between' },
    coinBtn: { padding: 4, backgroundColor: '#E5E7EB', borderRadius: 8 },
    coinValue: { fontSize: 14, fontWeight: 'bold', color: '#1F2937', width: 50, textAlign: 'center' },
    discountText: { fontSize: 13, fontWeight: '600', color: '#059669' },

    priceContainer: { alignItems: 'center', marginBottom: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    priceLabel: { fontSize: 14, color: '#6B7280' },
    priceValue: { fontSize: 24, fontWeight: 'bold', color: '#4F46E5' },

    methodsContainer: { width: '100%', marginBottom: 20 },
    sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },

    methodCard: { backgroundColor: "#FFF", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 8 },
    selectedMethod: { borderColor: "#4F46E5", backgroundColor: "#F5F7FF" },
    selectedMethodText: { color: "#4F46E5", fontWeight: '700' },
    methodHeader: { flexDirection: "row", alignItems: "center" },
    methodTitle: { fontSize: 15, fontWeight: "500", color: "#1F2937" },

    balanceText: { marginTop: 2, fontSize: 12, color: "#6B7280" },
    errorText: { marginTop: 2, fontSize: 11, color: "#EF4444" },

    gatewayOptions: { flexDirection: "row", gap: 8, marginTop: 12, paddingLeft: 36, flexWrap: 'wrap' },
    chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: 'transparent' },
    selectedChip: { backgroundColor: "#EEF2FF", borderColor: '#4F46E5' },
    chipText: { fontSize: 11, color: "#4B5563" },
    selectedChipText: { color: "#4F46E5", fontWeight: '600' },

    confirmButton: { width: '100%', backgroundColor: '#4F46E5', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    disabledButton: { backgroundColor: '#9CA3AF' },
    confirmButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default VipUpgradeModal;