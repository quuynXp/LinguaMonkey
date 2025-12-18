import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Alert, Switch, Image } from 'react-native';
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
import { TransactionRequest, PaymentRequest, CourseResponse } from '../../types/dto';
import { getCourseImage } from '../../utils/courseUtils';
import { getAvatarSource } from '../../utils/avatarUtils';
import { getCountryFlag } from '../../utils/flagUtils';
import { CourseVersionDiscount } from '../../types/entity';

interface CoursePurchaseModalProps {
    visible: boolean;
    onClose: () => void;
    course: CourseResponse | null;
    activeDiscount?: CourseVersionDiscount;
    onSuccess?: () => void;
}

const CoursePurchaseModal: React.FC<CoursePurchaseModalProps> = ({ visible, onClose, course, activeDiscount, onSuccess }) => {
    const { t } = useTranslation();
    const { user } = useUserStore();
    const navigation = useNavigation<any>();

    const { convert, isLoading: loadingRates } = useCurrencyConverter();
    const { data: walletData, isLoading: loadingBalance } = useWallet().useWalletBalance(user?.userId);
    const createTransaction = useTransactionsApi().useCreateTransaction();
    const createPaymentUrl = useTransactionsApi().useCreatePayment();

    const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'gateway'>('wallet');
    const [gatewayProvider, setGatewayProvider] = useState<Enums.TransactionProvider>(Enums.TransactionProvider.STRIPE);
    const [isProcessing, setIsProcessing] = useState(false);

    const [useCoins, setUseCoins] = useState(false);
    const [coinsToUse, setCoinsToUse] = useState(0);

    const COINS_PER_USD = 1000;
    const userCurrency = user?.country === Enums.Country.VIETNAM ? 'VND' : 'USD';
    const availableCoins = user?.coins || 0;

    const originalPrice = course?.latestPublicVersion.price || 0;
    const discountPercent = activeDiscount ? activeDiscount.discountPercentage : 0;
    const priceAfterDiscount = discountPercent > 0
        ? originalPrice * (1 - discountPercent / 100)
        : originalPrice;

    useEffect(() => {
        if (visible) {
            setUseCoins(false);
            setCoinsToUse(0);
            setPaymentMethod('wallet');
        }
    }, [visible]);

    const maxCoinsUsable = useMemo(() => {
        const priceInCoins = priceAfterDiscount * COINS_PER_USD;
        const maxAllowed = Math.floor(priceInCoins * 0.5);
        return Math.floor(Math.min(availableCoins, maxAllowed));
    }, [availableCoins, priceAfterDiscount]);

    useEffect(() => {
        setCoinsToUse(useCoins ? maxCoinsUsable : 0);
    }, [useCoins, maxCoinsUsable]);

    const discountUSD = coinsToUse / COINS_PER_USD;
    const finalPriceUSD = Math.max(0, priceAfterDiscount - discountUSD);
    const displayPrice = convert(finalPriceUSD, userCurrency);

    const getBalanceInUSD = () => {
        const balance = walletData?.balance || 0;
        if (userCurrency === 'USD') return '';
        const rate = convert(1, 'VND');
        if (!rate || rate === 0) return '';
        const balanceUSD = balance / rate;
        return `(≈ $${balanceUSD.toFixed(2)})`;
    };

    const handleConfirm = async () => {
        if (!user?.userId || !course) return;
        setIsProcessing(true);

        try {
            if (paymentMethod === 'wallet') {
                await handleWalletPayment();
            } else {
                await handleGatewayPayment();
            }
        } catch (error) {
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
                            navigation.navigate('Deposit', { minAmount: finalPriceUSD });
                        }
                    }
                ]
            );
            return;
        }

        const payload: TransactionRequest = {
            userId: user!.userId,
            amount: Number(displayPrice.toFixed(2)),
            currency: userCurrency,
            provider: Enums.TransactionProvider.INTERNAL,
            type: Enums.TransactionType.PAYMENT,
            status: Enums.TransactionStatus.SUCCESS,
            description: `Buy Course: ${course.title}`,
            coins: useCoins ? coinsToUse : 0,
            receiverId: course.creatorId,
            courseVersionId: course.latestPublicVersion.versionId
        };

        createTransaction.mutate(payload, {
            onSuccess: () => {
                Alert.alert("Success", "Course purchased successfully!");
                if (onSuccess) onSuccess();
                onClose();
            },
            onError: () => Alert.alert(t('common.error'), t('payment.transactionFailed'))
        });
    };

    const handleGatewayPayment = async () => {
        const payload: PaymentRequest & { coins?: number; type?: string } = {
            userId: user!.userId,
            amount: Number(displayPrice.toFixed(2)),
            currency: userCurrency,
            provider: gatewayProvider,
            type: Enums.TransactionType.PAYMENT,
            returnUrl: "linguamonkey://course-success",
            description: `Buy Course: ${course?.title}`,
            coins: useCoins ? coinsToUse : 0
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

    if (!course) return null;

    const authorAvatar = getAvatarSource(course.creatorAvatar, "MALE");
    const rating = course.averageRating ? course.averageRating.toFixed(1) : '0.0';

    return (
        <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Icon name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>

                    <View style={styles.headerRow}>
                        <Image source={getCourseImage(course.latestPublicVersion.thumbnailUrl)} style={styles.courseThumb} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title} numberOfLines={2}>{course.title}</Text>
                            <View style={styles.metaRow}>
                                <Icon name="star" size={14} color="#F59E0B" />
                                <Text style={styles.ratingText}>{rating} ({course.reviewCount})</Text>
                            </View>
                            <View style={styles.authorRow}>
                                <Image source={authorAvatar} style={styles.authorAvatar} />
                                <Text style={styles.authorName} numberOfLines={1}>{course.creatorName}</Text>
                                {course.creatorCountry && getCountryFlag(course.creatorCountry, 12)}
                            </View>
                        </View>
                    </View>

                    <View style={styles.coinSection}>
                        <View style={styles.coinHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Icon name="monetization-on" size={20} color="#F59E0B" />
                                <Text style={styles.coinLabel}>{t('common.coins')} ({availableCoins})</Text>
                            </View>
                            <Switch value={useCoins} onValueChange={setUseCoins} trackColor={{ false: "#D1D5DB", true: "#FBBF24" }} />
                        </View>
                        {useCoins && (
                            <View style={styles.coinControls}>
                                <Text style={styles.coinValue}>{coinsToUse} coins</Text>
                                <Text style={styles.discountText}>- ${discountUSD.toFixed(2)}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.priceContainer}>
                        {loadingRates ? <ActivityIndicator color="#4F46E5" /> : (
                            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                                <Text style={styles.priceLabel}>{t('payment.total')}</Text>
                                <Text style={styles.priceValue}>{displayPrice.toLocaleString()} {userCurrency}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.methodsContainer}>
                        <TouchableOpacity style={[styles.methodCard, paymentMethod === 'wallet' && styles.selectedMethod]} onPress={() => setPaymentMethod('wallet')}>
                            <View style={styles.methodHeader}>
                                <Icon name="account-balance-wallet" size={24} color="#4F46E5" />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.methodTitle}>{t('payment.myWallet')}</Text>
                                    <Text style={styles.balanceText}>{walletData?.balance.toLocaleString()} {userCurrency} {getBalanceInUSD()}</Text>
                                </View>
                                {paymentMethod === 'wallet' && <Icon name="check-circle" size={20} color="#4F46E5" />}
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.methodCard, paymentMethod === 'gateway' && styles.selectedMethod]} onPress={() => setPaymentMethod('gateway')}>
                            <View style={styles.methodHeader}>
                                <Icon name="credit-card" size={24} color="#6B7280" />
                                <Text style={[styles.methodTitle, { marginLeft: 12 }]}>{t('payment.externalGateway')}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={[styles.confirmButton, isProcessing && styles.disabledButton]} onPress={handleConfirm} disabled={isProcessing}>
                        {isProcessing ? <ActivityIndicator color="#FFF" /> : (
                            <Text style={styles.confirmButtonText}>{paymentMethod === 'wallet' ? t('payment.payNow') : t('payment.continueToGateway')}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = createScaledSheet({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
    container: { width: '100%', backgroundColor: 'white', borderRadius: 24, padding: 20 },
    closeButton: { position: 'absolute', top: 16, right: 16, zIndex: 10 },
    headerRow: { flexDirection: 'row', marginBottom: 20, gap: 12 },
    courseThumb: { width: 80, height: 60, borderRadius: 8 },
    title: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingText: { fontSize: 12, color: '#6B7280' },
    authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    authorAvatar: { width: 20, height: 20, borderRadius: 10 },
    authorName: { fontSize: 12, color: '#4B5563' },
    coinSection: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10, marginBottom: 16 },
    coinHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    coinLabel: { marginLeft: 8, fontSize: 13, fontWeight: '600' },
    coinControls: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    coinValue: { fontSize: 14, fontWeight: 'bold' },
    discountText: { fontSize: 13, color: '#059669', fontWeight: 'bold' },
    priceContainer: { alignItems: 'center', marginBottom: 20 },
    priceLabel: { fontSize: 14, color: '#6B7280' },
    priceValue: { fontSize: 24, fontWeight: 'bold', color: '#4F46E5' },
    methodsContainer: { marginBottom: 20 },
    methodCard: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 8 },
    selectedMethod: { borderColor: "#4F46E5", backgroundColor: "#F5F7FF" },
    methodHeader: { flexDirection: "row", alignItems: "center" },
    methodTitle: { fontSize: 15, fontWeight: "500" },
    balanceText: { fontSize: 12, color: "#6B7280" },
    confirmButton: { backgroundColor: '#4F46E5', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    disabledButton: { backgroundColor: '#9CA3AF' },
    confirmButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default CoursePurchaseModal;