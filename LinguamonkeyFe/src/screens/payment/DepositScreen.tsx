import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import ScreenLayout from '../../components/layout/ScreenLayout';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { createScaledSheet } from '../../utils/scaledStyles';
import { useUserStore } from '../../stores/UserStore';
import { useWallet } from '../../hooks/useWallet';
import { DepositRequest } from '../../types/dto';
import * as WebBrowser from 'expo-web-browser';

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000];

const DepositScreen = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { user } = useUserStore();
    const { minAmount } = route.params || {};

    const [amount, setAmount] = useState<string>(minAmount ? minAmount.toString() : '');
    const [provider, setProvider] = useState<'VNPAY' | 'STRIPE'>('VNPAY');

    const depositMutation = useWallet().useDeposit();

    const handleDeposit = () => {
        const numericAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10);

        if (!numericAmount || numericAmount < 10000) {
            Alert.alert(t('common.error'), t('deposit.minAmountError', { min: '10,000' }));
            return;
        }

        if (!user?.userId) return;

        const payload: DepositRequest = {
            userId: user.userId,
            amount: numericAmount,
            currency: 'VND', // Mặc định VND cho nạp tiền, Backend xử lý convert nếu cần
            provider: provider as any, // Enum mapping
            returnUrl: 'linguamonkey://deposit-result', // Deep link
        };

        depositMutation.mutate(payload, {
            onSuccess: async (url) => {
                if (url) {
                    await WebBrowser.openBrowserAsync(url);
                    // Có thể thêm logic lắng nghe deep link quay về để refresh ví
                }
            },
            onError: () => {
                Alert.alert(t('common.error'), t('deposit.failed'));
            }
        });
    };

    return (
        <ScreenLayout style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('deposit.title', 'Nạp Tiền Vào Ví')}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.label}>{t('deposit.enterAmount')}</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor="#9CA3AF"
                        />
                        <Text style={styles.currency}>VND</Text>
                    </View>

                    <View style={styles.quickAmountContainer}>
                        {QUICK_AMOUNTS.map((val) => (
                            <TouchableOpacity
                                key={val}
                                style={styles.chip}
                                onPress={() => setAmount(val.toString())}
                            >
                                <Text style={styles.chipText}>{val.toLocaleString()}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <Text style={styles.sectionTitle}>{t('payment.selectMethod')}</Text>

                <TouchableOpacity
                    style={[styles.methodCard, provider === 'VNPAY' && styles.selectedMethod]}
                    onPress={() => setProvider('VNPAY')}
                >
                    <Icon name="qr-code" size={24} color="#005BAA" />
                    <Text style={styles.methodTitle}>VNPAY-QR / ATM Nội địa</Text>
                    {provider === 'VNPAY' && <Icon name="check-circle" size={20} color="#4F46E5" />}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.methodCard, provider === 'STRIPE' && styles.selectedMethod]}
                    onPress={() => setProvider('STRIPE')}
                >
                    <Icon name="credit-card" size={24} color="#635BFF" />
                    <Text style={styles.methodTitle}>Visa / MasterCard (Stripe)</Text>
                    {provider === 'STRIPE' && <Icon name="check-circle" size={20} color="#4F46E5" />}
                </TouchableOpacity>

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleDeposit}
                    disabled={depositMutation.isPending}
                >
                    {depositMutation.isPending ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.confirmButtonText}>
                            {t('deposit.confirm', 'Xác nhận nạp')}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#FFF' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
    content: { padding: 20 },
    card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 24, elevation: 2 },
    label: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 8 },
    input: { flex: 1, fontSize: 32, fontWeight: '700', color: '#1F2937' },
    currency: { fontSize: 20, fontWeight: '600', color: '#9CA3AF', marginLeft: 8 },
    quickAmountContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
    chip: { backgroundColor: '#F3F4F6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
    chipText: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },
    methodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', gap: 12 },
    selectedMethod: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
    methodTitle: { flex: 1, fontSize: 16, color: '#1F2937', fontWeight: '500' },
    footer: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
    confirmButton: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, alignItems: 'center' },
    confirmButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default DepositScreen;