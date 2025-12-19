import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import ScreenLayout from '../../components/layout/ScreenLayout';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { createScaledSheet } from '../../utils/scaledStyles';
import { useUserStore } from '../../stores/UserStore';
import { useWallet } from '../../hooks/useWallet';
import { DepositRequest } from '../../types/dto';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

enum TransactionProvider {
    VNPAY = 'VNPAY',
    STRIPE = 'STRIPE',
}

const QUICK_AMOUNTS = [10, 20, 50, 100];

const DepositScreen = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const { user } = useUserStore();
    const { minAmount } = route.params || {};

    const [amount, setAmount] = useState<string>(minAmount ? minAmount.toString() : '');
    const [provider, setProvider] = useState<TransactionProvider>(TransactionProvider.STRIPE);
    const [isProcessing, setIsProcessing] = useState(false);

    const { useDeposit, useWalletBalance } = useWallet();
    const depositMutation = useDeposit();
    const { refetch: refetchWallet } = useWalletBalance(user?.userId);

    useEffect(() => {
        const handleDeepLink = async (event: { url: string }) => {
            const { url } = event;
            // Catch both standard scheme (monkeylingua://) and expo scheme
            if (url && (url.includes('deposit-result') || url.includes('payment-success') || url.includes('vnp_ResponseCode'))) {

                // Close the browser immediately to prevent "hanging"
                try {
                    WebBrowser.dismissBrowser();
                } catch (e) {
                    console.log('Browser already closed');
                }

                const queryParams = Linking.parse(url).queryParams;
                const status = queryParams?.status || queryParams?.vnp_ResponseCode;

                setIsProcessing(true);
                // Force refetch logic to ensure status is updated
                await refetchWallet();
                setIsProcessing(false);

                if (status === 'success' || status === '00' || url.includes('success')) {
                    Alert.alert(
                        t('common.success'),
                        t('deposit.successMessage'),
                        [{ text: 'OK', onPress: () => navigation.goBack() }]
                    );
                } else {
                    Alert.alert(t('common.error'), t('deposit.failedMessage'));
                }
            }
        };

        const subscription = Linking.addEventListener('url', handleDeepLink);

        // Handle cold start deep link
        Linking.getInitialURL().then((url) => {
            if (url) handleDeepLink({ url });
        });

        return () => {
            subscription.remove();
        };
    }, [refetchWallet, navigation, t]);

    const handleDeposit = () => {
        const numericAmount = parseFloat(amount);

        if (!numericAmount || numericAmount < 1) {
            Alert.alert(t('common.error'), t('deposit.minAmountError', { min: '1 USD' }));
            return;
        }

        if (!user?.userId) return;

        // Ensure this string matches the host in AndroidManifest
        // Result: monkeylingua://deposit-result
        const returnUrl = Linking.createURL('deposit-result');

        const payload: DepositRequest = {
            userId: user.userId,
            amount: numericAmount,
            currency: 'USD',
            provider: provider,
            returnUrl: returnUrl,
        };

        depositMutation.mutate(payload, {
            onSuccess: async (url) => {
                if (url) {
                    await WebBrowser.openBrowserAsync(url);
                } else {
                    Alert.alert(t('common.error'), 'Failed to get payment link');
                }
            },
            onError: (error: any) => {
                Alert.alert(t('common.error'), error?.message || t('deposit.failed'));
            },
        });
    };

    return (
        <ScreenLayout style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('deposit.title')}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
                    <Text style={styles.label}>{t('deposit.enterAmount')}</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={amount}
                            onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor="#9CA3AF"
                        />
                        <Text style={styles.currency}>USD</Text>
                    </View>

                    <View style={styles.quickAmountContainer}>
                        {QUICK_AMOUNTS.map((val) => (
                            <TouchableOpacity
                                key={val}
                                style={[styles.chip, parseFloat(amount) === val && styles.activeChip]}
                                onPress={() => setAmount(val.toString())}
                            >
                                <Text style={[styles.chipText, parseFloat(amount) === val && styles.activeChipText]}>
                                    ${val}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <Text style={styles.sectionTitle}>{t('payment.selectMethod')}</Text>

                <TouchableOpacity
                    style={[styles.methodCard, provider === TransactionProvider.STRIPE && styles.selectedMethod]}
                    onPress={() => setProvider(TransactionProvider.STRIPE)}
                >
                    <Icon name="credit-card" size={24} color="#635BFF" />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.methodTitle}>Stripe (International Cards)</Text>
                        <Text style={styles.methodSubtitle}>Pay with Visa/Mastercard in USD</Text>
                    </View>
                    {provider === TransactionProvider.STRIPE && <Icon name="check-circle" size={20} color="#4F46E5" />}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.methodCard, provider === TransactionProvider.VNPAY && styles.selectedMethod]}
                    onPress={() => setProvider(TransactionProvider.VNPAY)}
                >
                    <Icon name="qr-code" size={24} color="#005BAA" />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.methodTitle}>VNPAY</Text>
                        <Text style={styles.methodSubtitle}>Pay with Vietnam local bank accounts</Text>
                    </View>
                    {provider === TransactionProvider.VNPAY && <Icon name="check-circle" size={20} color="#4F46E5" />}
                </TouchableOpacity>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.confirmButton, (depositMutation.isPending || isProcessing) && styles.disabledButton]}
                    onPress={handleDeposit}
                    disabled={depositMutation.isPending || isProcessing}
                >
                    {depositMutation.isPending || isProcessing ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.confirmButtonText}>{t('deposit.confirm')}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 20 : 0,
        paddingBottom: 15,
        backgroundColor: '#FFF',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
    content: { padding: 20, paddingBottom: 40 },
    card: {
        backgroundColor: '#FFF',
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    label: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingBottom: 8,
    },
    input: {
        flex: 1,
        fontSize: 32,
        fontWeight: '700',
        color: '#1F2937',
        padding: 0,
    },
    currency: { fontSize: 20, fontWeight: '600', color: '#9CA3AF', marginLeft: 8 },
    quickAmountContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
    chip: {
        backgroundColor: '#F3F4F6',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    activeChip: {
        backgroundColor: '#EEF2FF',
        borderColor: '#4F46E5',
    },
    chipText: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
    activeChipText: { color: '#4F46E5', fontWeight: '600' },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },
    methodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 12,
    },
    selectedMethod: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
    methodTitle: { fontSize: 16, color: '#1F2937', fontWeight: '500' },
    methodSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    footer: {
        padding: 20,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    confirmButton: {
        backgroundColor: '#4F46E5',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    disabledButton: { backgroundColor: '#9CA3AF' },
    confirmButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default DepositScreen;