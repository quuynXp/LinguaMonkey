import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as WebBrowser from 'expo-web-browser';
import { useUserStore } from '../../stores/UserStore';
import { useWallet } from '../../hooks/useWallet';
import { createScaledSheet } from '../../utils/scaledStyles';
import * as Enums from '../../types/enums';
import { useCurrencyConverter } from '../../hooks/useCurrencyConverter';

type WebBrowserResultType = 'cancel' | 'dismiss' | 'success' | 'opened' | 'error';

const TopUpScreen = ({ navigation }) => {
    const { t } = useTranslation();
    const { user } = useUserStore();
    const [customAmount, setCustomAmount] = useState('');
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const formatCurrency = useCurrencyConverter().convert;

    const [selectedProvider, setSelectedProvider] = useState<Enums.TransactionProvider>(Enums.TransactionProvider.VNPAY);

    const { mutate: deposit, isPending } = useWallet().useDeposit();

    const MINIMUM_AMOUNT = 10000;

    const presetAmounts = [100000, 200000, 500000, 1000000, 2000000, 5000000];
    const providers = [
        { id: Enums.TransactionProvider.VNPAY, label: t('provider.vnpay') ?? 'VNPAY', icon: 'payment' },
        { id: Enums.TransactionProvider.STRIPE, label: t('provider.stripe') ?? 'Stripe', icon: 'credit-card' },
    ];

    const getAmount = () => {
        const parsedCustom = parseFloat(customAmount.replace(/[^0-9]/g, ''));

        if (!isNaN(parsedCustom) && parsedCustom > 0) {
            return Math.floor(parsedCustom);
        }
        return selectedAmount;
    };

    const handleTopUp = () => {
        if (!user?.userId) {
            return Alert.alert(t('common.error'), t('errors.userNotFound') ?? 'User not authenticated.');
        }

        const amount = getAmount();

        if (!amount || amount < MINIMUM_AMOUNT) {
            Alert.alert(t('common.error'), t('wallet.minimumAmount') ?? `Minimum top-up amount is ${formatCurrency(MINIMUM_AMOUNT, 'USD')}.`);
            return;
        }

        deposit(
            {
                userId: user.userId,
                amount: amount,
                provider: selectedProvider,
                currency: 'VND',
                returnUrl: 'linguamonkey://wallet/topup-success',
            },
            {
                onSuccess: async (paymentUrl) => {
                    const result = await WebBrowser.openBrowserAsync(paymentUrl);

                    const resultType = result.type as WebBrowserResultType;

                    if (resultType === 'success' || resultType === 'dismiss') {
                        navigation.navigate('WalletScreen');
                    }
                },
                onError: (error: any) => {
                    Alert.alert(t('common.error') ?? 'Payment failed.');
                },
            }
        );
    };

    const renderPresetAmount = ({ item }: { item: number }) => (
        <TouchableOpacity
            style={[
                styles.presetBtn,
                selectedAmount === item && styles.presetBtnSelected,
            ]}
            onPress={() => {
                setSelectedAmount(item);
                setCustomAmount(item.toLocaleString('vi-VN').replace('.', '')); // Loại bỏ dấu chấm ngăn cách hàng nghìn
            }}
        >
            <Text
                style={[
                    styles.presetBtnText,
                    selectedAmount === item && styles.presetBtnTextSelected,
                ]}
            >
                {formatCurrency(item, "USD")}
            </Text>
        </TouchableOpacity>
    );

    const currentAmount = getAmount();
    const isSubmitDisabled = isPending || !currentAmount || currentAmount < MINIMUM_AMOUNT;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('wallet.topupTitle') ?? 'Top Up Wallet'}</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Preset Amounts */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('wallet.quickAmount') ?? 'Quick Select'}</Text>
                <FlatList
                    data={presetAmounts}
                    renderItem={renderPresetAmount}
                    keyExtractor={(item) => item.toString()}
                    numColumns={3}
                    columnWrapperStyle={styles.columnWrapper}
                    scrollEnabled={false}
                />
            </View>

            {/* Custom Amount */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('wallet.customAmount') ?? 'Custom Amount'}</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.currencyText}>₫</Text>
                    <TextInput
                        style={styles.customInput}
                        placeholder={t('wallet.enterAmount') ?? 'Enter amount'}
                        keyboardType="numeric"
                        value={customAmount}
                        onChangeText={(text) => {
                            const cleanText = text.replace(/[^0-9]/g, '');
                            setCustomAmount(cleanText);
                            setSelectedAmount(null);
                        }}
                        placeholderTextColor="#9CA3AF"
                    />
                </View>
                <Text style={styles.helperText}>
                    {t('wallet.minimumAmount') ?? 'Minimum Amount'}: {formatCurrency(MINIMUM_AMOUNT, 'USD')}
                </Text>
            </View>

            {/* Payment Methods */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('wallet.paymentMethod') ?? 'Payment Method'}</Text>
                {providers.map((provider) => (
                    <TouchableOpacity
                        key={provider.id}
                        style={[
                            styles.providerBtn,
                            selectedProvider === provider.id && styles.providerBtnSelected,
                        ]}
                        onPress={() => setSelectedProvider(provider.id)}
                    >
                        <Icon name={provider.icon} size={24} color="#4F46E5" />
                        <Text style={styles.providerText}>{provider.label}</Text>
                        <View style={styles.radioButton}>
                            {selectedProvider === provider.id && (
                                <View style={styles.radioButtonInner} />
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Summary */}
            <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{t('wallet.totalAmount') ?? 'Total Amount'}</Text>
                <Text style={styles.summaryAmount}>
                    {formatCurrency(currentAmount || 0, 'USD')}
                </Text>
                <Text style={styles.summaryNote}>
                    {t('wallet.topupNote') ?? 'You will be redirected to the payment gateway.'}
                </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
                style={[styles.submitBtn, isSubmitDisabled && styles.submitBtnDisabled]}
                onPress={handleTopUp}
                disabled={isSubmitDisabled}
            >
                {isPending ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <Icon name="check" size={20} color="#fff" />
                        <Text style={styles.submitBtnText}>{t('wallet.proceed') ?? 'Proceed to Pay'}</Text>
                    </>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = createScaledSheet({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: '#fff' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
    section: { paddingHorizontal: 24, paddingVertical: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },

    columnWrapper: { gap: 12, marginBottom: 12 },
    presetBtn: { flex: 1, backgroundColor: '#fff', paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
    presetBtnSelected: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
    presetBtnText: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
    presetBtnTextSelected: { color: '#fff' },

    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12 },
    currencyText: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginRight: 8 },
    customInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#1F2937' },
    helperText: { fontSize: 12, color: '#6B7280', marginTop: 8 },

    providerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 },
    providerBtnSelected: { backgroundColor: '#F0F9FF', borderColor: '#4F46E5' },
    providerText: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '600', color: '#1F2937' },
    radioButton: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
    radioButtonInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4F46E5' },

    summaryCard: { backgroundColor: '#F9FAFB', marginHorizontal: 24, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
    summaryLabel: { fontSize: 14, color: '#6B7280' },
    summaryAmount: { fontSize: 28, fontWeight: 'bold', color: '#1F2937', marginVertical: 8 },
    summaryNote: { fontSize: 12, color: '#6B7280' },

    submitBtn: { marginHorizontal: 24, marginBottom: 24, backgroundColor: '#4F46E5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, gap: 8 },
    submitBtnDisabled: { backgroundColor: '#9CA3AF' },
    submitBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});

export default TopUpScreen;