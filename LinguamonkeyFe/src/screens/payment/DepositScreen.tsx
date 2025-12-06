import React, { useState, useEffect, useCallback } from 'react';
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

// Define Transaction Provider Enum locally to match DTO if not exported clearly
enum TransactionProvider {
    VNPAY = 'VNPAY',
    STRIPE = 'STRIPE',
}

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000];

const DepositScreen = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const { user } = useUserStore();
    const { minAmount } = route.params || {};

    const [amount, setAmount] = useState<string>(minAmount ? minAmount.toString() : '');
    const [provider, setProvider] = useState<TransactionProvider>(TransactionProvider.VNPAY);
    const [isProcessing, setIsProcessing] = useState(false);

    // Hook ví để nạp tiền và refresh số dư
    const { useDeposit, useWalletBalance } = useWallet();
    const depositMutation = useDeposit();
    const { refetch: refetchWallet } = useWalletBalance(user?.userId);

    // Xử lý Deep Link khi quay lại từ VNPAY/Stripe
    useEffect(() => {
        const handleDeepLink = async (event: Linking.EventType) => {
            const { url } = event;

            // Kiểm tra xem URL có phải là kết quả trả về của trang nạp tiền không
            // Ví dụ: linguamonkey://deposit-result?status=success
            if (url && url.includes('deposit-result')) {
                // Đóng trình duyệt web (quan trọng cho iOS)
                WebBrowser.dismissBrowser();

                // Parse query params để check status (tùy backend trả về query gì)
                const queryParams = Linking.parse(url).queryParams;
                const status = queryParams?.status || queryParams?.vnp_ResponseCode;

                setIsProcessing(true);

                // Refresh lại ví ngay lập tức để check tiền về chưa
                await refetchWallet();

                setIsProcessing(false);

                // Logic hiển thị thông báo dựa trên status (Logic này phụ thuộc backend trả về gì)
                // Giả sử backend trả về status=success hoặc vnp_ResponseCode=00
                if (status === 'success' || status === '00') {
                    Alert.alert(t('common.success'), t('deposit.successMessage', 'Nạp tiền thành công!'));
                    navigation.goBack();
                } else if (status === 'failed' || (status && status !== '00')) {
                    Alert.alert(t('common.error'), t('deposit.failedMessage', 'Giao dịch thất bại hoặc bị hủy.'));
                } else {
                    // Trường hợp fallback nếu không parse được status rõ ràng
                    Alert.alert(t('common.info'), t('deposit.processing', 'Đang xử lý giao dịch. Vui lòng kiểm tra ví sau giây lát.'));
                    navigation.goBack();
                }
            }
        };

        // Đăng ký lắng nghe sự kiện URL
        const subscription = Linking.addEventListener('url', handleDeepLink);

        // Check trường hợp App được mở lại từ trạng thái quit (Cold start)
        Linking.getInitialURL().then((url) => {
            if (url) handleDeepLink({ url } as Linking.EventType);
        });

        return () => {
            subscription.remove();
        };
    }, [refetchWallet, navigation, t]);

    const handleDeposit = () => {
        const numericAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10);

        if (!numericAmount || numericAmount < 10000) {
            Alert.alert(t('common.error'), t('deposit.minAmountError', { min: '10,000' }));
            return;
        }

        if (!user?.userId) return;

        // Tạo returnUrl động dựa trên môi trường (Expo Go hoặc Build Production)
        // Sẽ tạo ra dạng: exp://192.168.x.x:8081/--/deposit-result hoặc linguamonkey://deposit-result
        const returnUrl = Linking.createURL('deposit-result');

        console.log('Sending returnUrl to Backend:', returnUrl);

        const payload: DepositRequest = {
            userId: user.userId,
            amount: numericAmount,
            currency: 'VND',
            provider: provider,
            returnUrl: returnUrl, // Quan trọng: URL này backend sẽ dùng để redirect người dùng về
        };

        depositMutation.mutate(payload, {
            onSuccess: async (url) => {
                if (url) {
                    // Mở trình duyệt in-app
                    await WebBrowser.openBrowserAsync(url);
                    // Không alert success ở đây, đợi Deep Link quay về xử lý ở useEffect trên
                } else {
                    Alert.alert(t('common.error'), 'Không nhận được link thanh toán từ hệ thống.');
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
                <Text style={styles.headerTitle}>{t('deposit.title', 'Nạp Tiền Vào Ví')}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {/* Input Amount Section */}
                <View style={styles.card}>
                    <Text style={styles.label}>{t('deposit.enterAmount')}</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={amount}
                            onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))}
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
                                style={[styles.chip, parseInt(amount) === val && styles.activeChip]}
                                onPress={() => setAmount(val.toString())}
                            >
                                <Text style={[styles.chipText, parseInt(amount) === val && styles.activeChipText]}>
                                    {val.toLocaleString()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Payment Method Section */}
                <Text style={styles.sectionTitle}>{t('payment.selectMethod')}</Text>

                <TouchableOpacity
                    style={[styles.methodCard, provider === TransactionProvider.VNPAY && styles.selectedMethod]}
                    onPress={() => setProvider(TransactionProvider.VNPAY)}
                >
                    <Icon name="qr-code" size={24} color="#005BAA" />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.methodTitle}>VNPAY-QR / ATM Nội địa</Text>
                        <Text style={styles.methodSubtitle}>Quét mã QR hoặc dùng thẻ ATM/Visa Việt Nam</Text>
                    </View>
                    {provider === TransactionProvider.VNPAY && <Icon name="check-circle" size={20} color="#4F46E5" />}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.methodCard, provider === TransactionProvider.STRIPE && styles.selectedMethod]}
                    onPress={() => setProvider(TransactionProvider.STRIPE)}
                >
                    <Icon name="credit-card" size={24} color="#635BFF" />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.methodTitle}>Visa / MasterCard (Quốc tế)</Text>
                        <Text style={styles.methodSubtitle}>Thanh toán qua cổng Stripe</Text>
                    </View>
                    {provider === TransactionProvider.STRIPE && <Icon name="check-circle" size={20} color="#4F46E5" />}
                </TouchableOpacity>

            </ScrollView>

            {/* Footer Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.confirmButton, (depositMutation.isPending || isProcessing) && styles.disabledButton]}
                    onPress={handleDeposit}
                    disabled={depositMutation.isPending || isProcessing}
                >
                    {depositMutation.isPending || isProcessing ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.confirmButtonText}>
                            {t('deposit.confirm', 'Xác nhận nạp')}
                        </Text>
                    )}
                </TouchableOpacity>
                <Text style={styles.noteText}>
                    {t('deposit.redirectNote', 'Bạn sẽ được chuyển hướng đến cổng thanh toán an toàn.')}
                </Text>
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
        paddingHorizontal: 12,
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
    noteText: {
        textAlign: 'center',
        marginTop: 10,
        fontSize: 12,
        color: '#9CA3AF'
    }
});

export default DepositScreen;