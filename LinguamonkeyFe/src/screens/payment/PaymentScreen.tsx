import { useState, useEffect } from "react"
import { Alert, ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useUserStore } from "../../stores/UserStore"
import * as WebBrowser from "expo-web-browser"
import { useTransactionsApi } from "../../hooks/useTransaction"
import { useWallet } from "../../hooks/useWallet"
import { useCurrencyConverter } from "../../hooks/useCurrencyConverter"
import { createScaledSheet } from "../../utils/scaledStyles"
import { useTranslation } from "react-i18next"
import * as Enums from "../../types/enums"
import { PaymentRequest, TransactionRequest } from "../../types/dto"
import ScreenLayout from "../../components/layout/ScreenLayout"

interface CourseType {
  courseId: string;
  title: string;
  price: number;
  instructor: string;
}

const PaymentScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { course } = route.params as { course: CourseType };
  const { user } = useUserStore();

  const [selectedMethod, setSelectedMethod] = useState<"wallet" | "gateway">("gateway");
  const [gatewayProvider, setGatewayProvider] = useState<Enums.TransactionProvider>(Enums.TransactionProvider.VNPAY);

  // Hooks
  const { data: walletData, isLoading: loadingBalance } = useWallet().useWalletBalance(user?.userId);
  const createPaymentUrl = useTransactionsApi().useCreatePayment();
  const createTransaction = useTransactionsApi().useCreateTransaction();
  const { convert, isLoading: loadingRates } = useCurrencyConverter();

  // Currency Logic
  const userCurrency = user?.country ? (user.country === Enums.Country.VIETNAM ? 'VND' : 'USD') : 'VND'; // Fallback logic
  const displayPrice = convert(course.price, userCurrency);
  const isBalanceSufficient = (walletData?.balance || 0) >= course.price;

  const handlePayment = () => {
    if (!user?.userId) return;

    if (selectedMethod === "wallet") {
      if (!isBalanceSufficient) {
        Alert.alert(t('common.error'), t('payment.insufficientBalance'));
        return;
      }
      processWalletPayment();
    } else {
      processGatewayPayment();
    }
  };

  const processWalletPayment = () => {
    // Logic: Tạo transaction loại PAYMENT trừ tiền ví
    const payload: TransactionRequest = {
      userId: user!.userId,
      amount: course.price,
      provider: Enums.TransactionProvider.INTERNAL,
      status: Enums.TransactionStatus.SUCCESS, // Internal xử lý sync
      description: `Payment for course: ${course.title}`,
      // Backend cần xử lý logic: Nếu provider=INTERNAL & Type=PAYMENT -> Trừ tiền ví
    };

    createTransaction.mutate(payload, {
      onSuccess: () => {
        Alert.alert(t('common.success'), t('payment.success'));
        navigation.navigate('MyCoursesScreen');
      },
      onError: () => Alert.alert(t('common.error'), t('payment.failed'))
    });
  };

  const processGatewayPayment = () => {
    const payload: PaymentRequest = {
      userId: user!.userId,
      amount: course.price, // Gửi tiền gốc (VND), backend tự xử lý currency nếu cần
      provider: gatewayProvider,
      currency: "VND",
      returnUrl: "linguamonkey://payment/success",
      description: `Buy ${course.title}`,
    };

    createPaymentUrl.mutate(payload, {
      onSuccess: async (url) => {
        const result = await WebBrowser.openBrowserAsync(url);
        if (result.type === 'dismiss' || result.type === 'cancel') {
          // User closed browser
        }
      },
      onError: () => Alert.alert(t('common.error'), t('payment.gatewayError'))
    });
  };

  const renderPriceDisplay = () => {
    if (loadingRates) return <ActivityIndicator size="small" color="#4F46E5" />;
    return (
      <Text style={styles.totalValue}>
        {displayPrice.toLocaleString()} {userCurrency}
      </Text>
    );
  };

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('payment.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Course Info */}
        <View style={styles.card}>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.instructor}>by {course.instructor}</Text>
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.label}>{t('payment.total')}</Text>
            {renderPriceDisplay()}
          </View>
        </View>

        {/* Payment Methods */}
        <Text style={styles.sectionTitle}>{t('payment.selectMethod')}</Text>

        {/* Option 1: Wallet */}
        <TouchableOpacity
          style={[styles.methodCard, selectedMethod === 'wallet' && styles.selectedMethod]}
          onPress={() => setSelectedMethod('wallet')}
        >
          <View style={styles.methodHeader}>
            <Icon name="account-balance-wallet" size={24} color="#4F46E5" />
            <Text style={styles.methodTitle}>{t('payment.myWallet')}</Text>
            {selectedMethod === 'wallet' && <Icon name="check-circle" size={20} color="#4F46E5" />}
          </View>
          <Text style={styles.balanceText}>
            {t('payment.available')}: {loadingBalance ? '...' : walletData?.balance.toLocaleString()} VND
          </Text>
          {!isBalanceSufficient && (
            <Text style={styles.errorText}>{t('payment.insufficientWarning')}</Text>
          )}
        </TouchableOpacity>

        {/* Option 2: Gateway */}
        <TouchableOpacity
          style={[styles.methodCard, selectedMethod === 'gateway' && styles.selectedMethod]}
          onPress={() => setSelectedMethod('gateway')}
        >
          <View style={styles.methodHeader}>
            <Icon name="public" size={24} color="#10B981" />
            <Text style={styles.methodTitle}>{t('payment.externalGateway')}</Text>
            {selectedMethod === 'gateway' && <Icon name="check-circle" size={20} color="#10B981" />}
          </View>

          {selectedMethod === 'gateway' && (
            <View style={styles.gatewayOptions}>
              <TouchableOpacity
                style={[styles.chip, gatewayProvider === Enums.TransactionProvider.VNPAY && styles.selectedChip]}
                onPress={() => setGatewayProvider(Enums.TransactionProvider.VNPAY)}
              >
                <Text style={[styles.chipText, gatewayProvider === Enums.TransactionProvider.VNPAY && styles.selectedChipText]}>VNPAY</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, gatewayProvider === Enums.TransactionProvider.STRIPE && styles.selectedChip]}
                onPress={() => setGatewayProvider(Enums.TransactionProvider.STRIPE)}
              >
                <Text style={[styles.chipText, gatewayProvider === Enums.TransactionProvider.STRIPE && styles.selectedChipText]}>Stripe (Visa/Master)</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, (selectedMethod === 'wallet' && !isBalanceSufficient) && styles.disabledButton]}
          disabled={selectedMethod === 'wallet' && !isBalanceSufficient}
          onPress={handlePayment}
        >
          {createPaymentUrl.isPending || createTransaction.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.payButtonText}>
              {selectedMethod === 'wallet' ? t('payment.payNow') : t('payment.continueToGateway')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  )
}

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15, backgroundColor: "#FFF" },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#1F2937" },
  placeholder: { width: 24 },
  content: { flex: 1, padding: 20 },

  card: { backgroundColor: "#FFF", padding: 20, borderRadius: 12, marginBottom: 24, elevation: 2 },
  courseTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937", marginBottom: 4 },
  instructor: { fontSize: 14, color: "#6B7280" },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 16, color: "#4B5563" },
  totalValue: { fontSize: 20, fontWeight: "700", color: "#4F46E5" },

  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 12 },
  methodCard: { backgroundColor: "#FFF", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 12 },
  selectedMethod: { borderColor: "#4F46E5", backgroundColor: "#EEF2FF" },
  methodHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  methodTitle: { fontSize: 16, fontWeight: "500", flex: 1, color: "#1F2937" },
  balanceText: { marginLeft: 36, marginTop: 4, fontSize: 14, color: "#6B7280" },
  errorText: { marginLeft: 36, marginTop: 4, fontSize: 12, color: "#EF4444" },

  gatewayOptions: { flexDirection: "row", gap: 10, marginTop: 12, marginLeft: 36 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: "#F3F4F6" },
  selectedChip: { backgroundColor: "#4F46E5" },
  chipText: { fontSize: 12, color: "#4B5563" },
  selectedChipText: { color: "#FFF" },

  footer: { padding: 20, backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  payButton: { backgroundColor: "#4F46E5", padding: 16, borderRadius: 12, alignItems: "center" },
  disabledButton: { backgroundColor: "#9CA3AF" },
  payButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});

export default PaymentScreen;