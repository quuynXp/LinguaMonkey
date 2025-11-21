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
import { formatCurrency } from '../../utils/currency';
import { createScaledSheet } from '../../utils/scaledStyles';

const TopUpScreen = ({ navigation }) => {
    const { t } = useTranslation();
    const { user } = useUserStore();
    const [customAmount, setCustomAmount] = useState('');
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [selectedProvider, setSelectedProvider] = useState<'VNPAY' | 'STRIPE'>('VNPAY');

    const { mutate: deposit, isPending } = useWallet().useDeposit();

    const presetAmounts = [100000, 200000, 500000, 1000000, 2000000, 5000000];
    const providers = [
        { id: 'VNPAY', label: 'VNPAY', icon: 'payment' },
        { id: 'STRIPE', label: 'Stripe', icon: 'credit-card' },
    ];

    const getAmount = () => {
        if (customAmount && !isNaN(Number(customAmount))) {
            return Number(customAmount);
        }
        return selectedAmount;
    };

    const handleTopUp = () => {
        const amount = getAmount();

        if (!amount || amount < 10000) {
            Alert.alert(t('common.error'), t('wallet.minimumAmount'));
            return;
        }

        deposit(
            {
                userId: user!.userId,
                amount,
                provider: selectedProvider,
                currency: 'VND',
                returnUrl: 'linguamonkey://wallet/topup-success',
            },
            {
                onSuccess: async (paymentUrl) => {
                    const result = await WebBrowser.openBrowserAsync(paymentUrl);
                    if (result.type === 'success') {
                        navigation.navigate('Wallet');
                    }
                },
                onError: (error) => {
                    Alert.alert(t('common.error'), error.message);
                },
            }
        );
    };

    const renderPresetAmount = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.presetBtn,
                selectedAmount === item && styles.presetBtnSelected,
            ]}
            onPress={() => {
                setSelectedAmount(item);
                setCustomAmount('');
            }}
        >
            <Text
                style={[
                    styles.presetBtnText,
                    selectedAmount === item && styles.presetBtnTextSelected,
                ]}
            >
                {formatCurrency(item)}
            </Text>
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('wallet.topupTitle')}</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Preset Amounts */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('wallet.quickAmount')}</Text>
                <FlatList
                    data={presetAmounts}
                    renderItem={renderPresetAmount}
                    keyExtractor={(item) => item.toString()}
                    numColumns={3}
                    columnWrapperStyle={{ gap: 12 }}
                    scrollEnabled={false}
                />
            </View>

            {/* Custom Amount */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('wallet.customAmount')}</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.currencyText}>₫</Text>
                    <TextInput
                        style={styles.customInput}
                        placeholder={t('wallet.enterAmount')}
                        keyboardType="numeric"
                        value={customAmount}
                        onChangeText={(text) => {
                            setCustomAmount(text);
                            setSelectedAmount(null);
                        }}
                        placeholderTextColor="#9CA3AF"
                    />
                </View>
                <Text style={styles.helperText}>
                    {t('wallet.minimumAmount')}: {formatCurrency(10000)}
                </Text>
            </View>

            {/* Payment Methods */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('wallet.paymentMethod')}</Text>
                {providers.map((provider) => (
                    <TouchableOpacity
                        key={provider.id}
                        style={[
                            styles.providerBtn,
                            selectedProvider === provider.id && styles.providerBtnSelected,
                        ]}
                        onPress={() => setSelectedProvider(provider.id as any)}
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
                <Text style={styles.summaryLabel}>{t('wallet.totalAmount')}</Text>
                <Text style={styles.summaryAmount}>
                    {formatCurrency(getAmount() || 0)}
                </Text>
                <Text style={styles.summaryNote}>
                    {t('wallet.topupNote')}
                </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
                style={[styles.submitBtn, isPending && styles.submitBtnDisabled]}
                onPress={handleTopUp}
                disabled={isPending}
            >
                {isPending ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <Icon name="check" size={20} color="#fff" />
                        <Text style={styles.submitBtnText}>{t('wallet.proceed')}</Text>
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
    presetBtn: { backgroundColor: '#fff', paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
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
    summaryCard: { backgroundColor: '#F9FAFB', margin: 24, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
    summaryLabel: { fontSize: 14, color: '#6B7280' },
    summaryAmount: { fontSize: 28, fontWeight: 'bold', color: '#1F2937', marginVertical: 8 },
    summaryNote: { fontSize: 12, color: '#6B7280' },
    submitBtn: { marginHorizontal: 24, marginBottom: 24, backgroundColor: '#4F46E5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, gap: 8 },
    submitBtnDisabled: { backgroundColor: '#9CA3AF' },
    submitBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});

export default TopUpScreen;