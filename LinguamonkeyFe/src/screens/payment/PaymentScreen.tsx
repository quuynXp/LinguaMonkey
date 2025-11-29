import { useState, useEffect, useMemo } from "react"
import { Alert, ScrollView, Text, TouchableOpacity, View, ActivityIndicator, TextInput, Keyboard, Switch } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useUserStore } from "../../stores/UserStore"
import * as WebBrowser from "expo-web-browser"
import { useTransactionsApi } from "../../hooks/useTransaction"
import { useWallet } from "../../hooks/useWallet"
import { useCourses } from "../../hooks/useCourses"
import { useCurrencyConverter } from "../../hooks/useCurrencyConverter"

import { useTranslation } from "react-i18next"
import * as Enums from "../../types/enums"
import { PaymentRequest, TransactionRequest } from "../../types/dto"
import ScreenLayout from "../../components/layout/ScreenLayout"
import { createScaledSheet } from "../../utils/scaledStyles"

interface CourseType {
  courseId: string;
  title: string;
  price: number;
  instructor: string;
}

const PaymentScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const { course } = route.params as { course: CourseType };
  const { user } = useUserStore();

  const [selectedMethod, setSelectedMethod] = useState<"wallet" | "gateway">("gateway");
  const [gatewayProvider, setGatewayProvider] = useState<Enums.TransactionProvider>(Enums.TransactionProvider.VNPAY);

  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent: number } | null>(null);

  const [useCoins, setUseCoins] = useState(false);
  const [coinsToUse, setCoinsToUse] = useState(0);

  const { data: walletData, isLoading: loadingBalance } = useWallet().useWalletBalance(user?.userId);
  const createPaymentUrl = useTransactionsApi().useCreatePayment();
  const createTransaction = useTransactionsApi().useCreateTransaction();
  const { convert, isLoading: loadingRates } = useCurrencyConverter();

  const { mutate: validateDiscount, isPending: isValidatingCoupon } = useCourses().useValidateDiscount();

  const COINS_PER_USD = 1000;
  const originalPrice = course.price;

  const discountAmount = appliedDiscount
    ? (originalPrice * appliedDiscount.percent) / 100
    : 0;

  const priceAfterCoupon = Math.max(0, originalPrice - discountAmount);

  const availableCoins = user?.coins || 0;

  const maxCoinsUsable = useMemo(() => {
    const priceInCoins = priceAfterCoupon * COINS_PER_USD;
    return Math.floor(Math.min(availableCoins, priceInCoins));
  }, [availableCoins, priceAfterCoupon]);

  useEffect(() => {
    if (useCoins) {
      setCoinsToUse(maxCoinsUsable);
    } else {
      setCoinsToUse(0);
    }
  }, [useCoins, priceAfterCoupon, maxCoinsUsable]);

  const coinDiscountAmount = useCoins ? (coinsToUse / COINS_PER_USD) : 0;

  const finalAmount = Math.max(0, priceAfterCoupon - coinDiscountAmount);

  // Logic currency thống nhất
  const userCurrency = user?.country === Enums.Country.VIETNAM ? 'VND' : 'USD';

  const displayFinalPrice = convert(finalAmount, userCurrency);
  const displayOriginalPrice = convert(originalPrice, userCurrency);

  const isBalanceSufficient = (walletData?.balance || 0) >= displayFinalPrice;

  const handleApplyCoupon = () => {
    Keyboard.dismiss();
    if (!couponCode.trim()) return;

    validateDiscount({ code: couponCode, courseId: course.courseId }, {
      onSuccess: (data) => {
        setAppliedDiscount({
          code: data.code,
          percent: data.discountPercentage
        });
        Alert.alert(t("success"), t("payment.couponApplied", { percent: data.discountPercentage }));
      },
      onError: () => {
        setAppliedDiscount(null);
        Alert.alert(t("error"), t("payment.invalidCoupon"));
      }
    });
  };

  const handleRemoveCoupon = () => {
    setAppliedDiscount(null);
    setCouponCode("");
  };

  const increaseCoins = () => {
    if (coinsToUse + 100 <= maxCoinsUsable) {
      setCoinsToUse(prev => prev + 100);
    } else {
      setCoinsToUse(maxCoinsUsable);
    }
  };

  const decreaseCoins = () => {
    if (coinsToUse - 100 >= 0) {
      setCoinsToUse(prev => prev - 100);
    } else {
      setCoinsToUse(0);
    }
  };

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
    const cleanAmount = Number(displayFinalPrice.toFixed(2));

    const payload: TransactionRequest = {
      userId: user!.userId,
      amount: cleanAmount,
      provider: Enums.TransactionProvider.INTERNAL,
      currency: userCurrency,
      type: Enums.TransactionType.PAYMENT, // <--- FIXED: Added Type
      status: Enums.TransactionStatus.SUCCESS,
      description: `Payment for course: ${course.title} ${appliedDiscount ? `(Code: ${appliedDiscount.code})` : ''}`,
      coins: useCoins ? coinsToUse : 0
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
    const cleanAmount = Number(displayFinalPrice.toFixed(2));

    const payload: PaymentRequest & { coins?: number; type?: string } = {
      userId: user!.userId,
      amount: cleanAmount,
      provider: gatewayProvider,
      currency: userCurrency,
      type: Enums.TransactionType.PAYMENT, // <--- FIXED: Added Type
      returnUrl: "linguamonkey://payment/success",
      description: `Buy ${course.title} ${appliedDiscount ? `(Code: ${appliedDiscount.code})` : ''}`,
      coins: useCoins ? coinsToUse : 0
    };

    createPaymentUrl.mutate(payload, {
      onSuccess: async (url) => {
        if (url) {
          const result = await WebBrowser.openBrowserAsync(url);
          if (result.type === 'dismiss' || result.type === 'cancel') {
          }
        }
      },
      onError: () => Alert.alert(t('common.error'), t('payment.gatewayError'))
    });
  };

  // ... Render code (UI) ...
  const renderPriceDisplay = () => {
    if (loadingRates) return <ActivityIndicator size="small" color="#4F46E5" />;
    return (
      <View style={{ alignItems: 'flex-end' }}>
        {(appliedDiscount || useCoins) && (
          <Text style={styles.originalPrice}>
            {displayOriginalPrice.toLocaleString()} {userCurrency}
          </Text>
        )}
        <Text style={styles.totalValue}>
          {displayFinalPrice.toLocaleString()} {userCurrency}
        </Text>
      </View>
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
        <View style={styles.card}>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.instructor}>by {course.instructor}</Text>
          <View style={styles.divider} />

          <View style={styles.couponContainer}>
            <View style={styles.inputWrapper}>
              <Icon name="local-offer" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.couponInput}
                placeholder={t("payment.enterCode")}
                value={couponCode}
                onChangeText={setCouponCode}
                editable={!appliedDiscount}
                autoCapitalize="characters"
              />
            </View>
            {appliedDiscount ? (
              <TouchableOpacity style={styles.removeBtn} onPress={handleRemoveCoupon}>
                <Icon name="close" size={20} color="#EF4444" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.applyBtn, (!couponCode || isValidatingCoupon) && styles.disabledBtn]}
                onPress={handleApplyCoupon}
                disabled={!couponCode || isValidatingCoupon}
              >
                {isValidatingCoupon ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.applyText}>{t("common.apply")}</Text>}
              </TouchableOpacity>
            )}
          </View>

          {appliedDiscount && (
            <View style={styles.discountRow}>
              <Text style={styles.discountLabel}>{t("payment.discountApplied")}:</Text>
              <Text style={styles.discountValue}>-{appliedDiscount.percent}% ({appliedDiscount.code})</Text>
            </View>
          )}

          <View style={styles.coinSection}>
            <View style={styles.coinHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="monetization-on" size={20} color="#F59E0B" />
                <Text style={styles.coinLabel}>Use Coins ({availableCoins})</Text>
              </View>
              <Switch
                value={useCoins}
                onValueChange={setUseCoins}
                trackColor={{ false: "#D1D5DB", true: "#FBBF24" }}
                thumbColor={useCoins ? "#F59E0B" : "#F4F3F4"}
                disabled={availableCoins <= 0}
              />
            </View>

            {useCoins && (
              <View style={styles.coinControls}>
                <TouchableOpacity onPress={decreaseCoins} style={styles.coinBtn}>
                  <Icon name="remove" size={20} color="#6B7280" />
                </TouchableOpacity>
                <Text style={styles.coinValue}>{coinsToUse}</Text>
                <TouchableOpacity onPress={increaseCoins} style={styles.coinBtn}>
                  <Icon name="add" size={20} color="#6B7280" />
                </TouchableOpacity>
                <Text style={styles.discountText}>
                  - ${(coinsToUse / COINS_PER_USD).toFixed(2)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.priceRow}>
            <Text style={styles.label}>{t('payment.total')}</Text>
            {renderPriceDisplay()}
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('payment.selectMethod')}</Text>

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
            {t('payment.available')}: {loadingBalance ? '...' : walletData?.balance.toLocaleString()} {userCurrency}
          </Text>
          {!isBalanceSufficient && (
            <Text style={styles.errorText}>{t('payment.insufficientWarning')}</Text>
          )}
        </TouchableOpacity>

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

  couponContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, marginRight: 8 },
  inputIcon: { marginRight: 8 },
  couponInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#1F2937' },
  applyBtn: { backgroundColor: '#4F46E5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  disabledBtn: { backgroundColor: '#A5B4FC' },
  applyText: { color: '#FFF', fontWeight: '600', fontSize: 12 },
  removeBtn: { padding: 10, backgroundColor: '#FEF2F2', borderRadius: 8 },
  discountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  discountLabel: { color: '#059669', fontSize: 14 },
  discountValue: { color: '#059669', fontWeight: 'bold', fontSize: 14 },

  coinSection: { marginTop: 12, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#F3F4F6' },
  coinHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  coinLabel: { marginLeft: 8, fontSize: 14, fontWeight: '600', color: '#4B5563' },
  coinControls: { flexDirection: 'row', alignItems: 'center', marginTop: 12, justifyContent: 'space-between' },
  coinBtn: { padding: 4, backgroundColor: '#E5E7EB', borderRadius: 8 },
  coinValue: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', width: 60, textAlign: 'center' },
  discountText: { fontSize: 14, fontWeight: '600', color: '#059669' },

  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 16, color: "#4B5563" },
  originalPrice: { fontSize: 14, color: '#9CA3AF', textDecorationLine: 'line-through', marginBottom: 2 },
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