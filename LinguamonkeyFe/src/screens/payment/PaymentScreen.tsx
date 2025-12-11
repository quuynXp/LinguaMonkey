import { useState, useEffect, useMemo } from "react"
import { Alert, ScrollView, Text, TouchableOpacity, View, ActivityIndicator, TextInput, Keyboard, Switch } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useUserStore } from "../../stores/UserStore"
import * as WebBrowser from "expo-web-browser"
import * as Linking from "expo-linking"
import { useTransactionsApi } from "../../hooks/useTransaction"
import { useWallet } from "../../hooks/useWallet"
import { useCourses } from "../../hooks/useCourses"
import { useCurrencyConverter } from "../../hooks/useCurrencyConverter"
import { useTranslation } from "react-i18next"
import * as Enums from "../../types/enums"
import { PaymentRequest, TransactionRequest } from "../../types/dto"
import ScreenLayout from "../../components/layout/ScreenLayout"
import { createScaledSheet } from "../../utils/scaledStyles"
import PaymentMethodSelector from "../../components/payment/PaymentMethodSelector"

// --- FIX: Đổi tên Interface để tránh trùng với Enum CourseType ---
interface PaymentCourseVersion {
  versionId: string;
  price: number;
  currency?: string;
}

interface PaymentCourseParams {
  courseId: string;
  title: string;
  instructor: string;
  creatorId: string;
  latestPublicVersion: PaymentCourseVersion;
}

const PaymentScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();

  // --- FIX: Cast kiểu về Interface mới ---
  const { course } = route.params as { course: PaymentCourseParams };
  const { user } = useUserStore();

  const [selectedMethod, setSelectedMethod] = useState<"wallet" | "gateway">("gateway");
  const [gatewayProvider, setGatewayProvider] = useState<Enums.TransactionProvider>(Enums.TransactionProvider.VNPAY);

  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent: number } | null>(null);

  const [useCoins, setUseCoins] = useState(false);
  const [coinsToUse, setCoinsToUse] = useState(0);

  const { data: walletData, refetch: refetchWallet } = useWallet().useWalletBalance(user?.userId);
  const createPaymentUrl = useTransactionsApi().useCreatePayment();
  const createTransaction = useTransactionsApi().useCreateTransaction();
  const { convert, isLoading: loadingRates } = useCurrencyConverter();
  const { mutate: validateDiscount, isPending: isValidatingCoupon } = useCourses().useValidateDiscount();

  // Refresh course status sau khi mua thành công
  const { refetch: refetchCourse } = useCourses().useCourse(course.courseId);

  const COINS_PER_USD = 1000;
  const originalPrice = course.latestPublicVersion?.price || 0;

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
    setCoinsToUse(useCoins ? maxCoinsUsable : 0);
  }, [useCoins, maxCoinsUsable]);

  const coinDiscountAmount = useCoins ? (coinsToUse / COINS_PER_USD) : 0;
  const finalAmount = Math.max(0, priceAfterCoupon - coinDiscountAmount);
  const userCurrency = user?.country === Enums.Country.VIETNAM ? 'VND' : 'USD';

  const displayFinalPrice = convert(finalAmount, userCurrency);
  const displayOriginalPrice = convert(originalPrice, userCurrency);
  const isBalanceSufficient = (walletData?.balance || 0) >= displayFinalPrice;

  // --- LOGIC DEEP LINK (Bắt tín hiệu từ VNPAY) ---
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      console.log("Deep link received:", url);
      if (url.includes('payment/result')) {
        const queryParams = Linking.parse(url).queryParams;
        WebBrowser.dismissBrowser();

        if (queryParams?.status === 'success') {
          Alert.alert(t('common.success'), t('payment.success'), [
            {
              text: 'OK', onPress: () => {
                refetchWallet();
                refetchCourse();
                navigation.navigate('MyCoursesScreen');
              }
            }
          ]);
        } else {
          Alert.alert(t('common.error'), t('payment.failed') + ': ' + (queryParams?.reason || 'Unknown'));
        }
      }
    };

    const subscription = Linking.addEventListener("url", handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // --- FIX: Định nghĩa hàm handleApplyCoupon ---
  const handleApplyCoupon = () => {
    Keyboard.dismiss();
    if (!couponCode.trim()) return;

    validateDiscount({ code: couponCode, versionId: course.latestPublicVersion.versionId }, {
      onSuccess: (data) => {
        setAppliedDiscount({ code: data.code, percent: data.discountPercentage });
        Alert.alert(t("success"), t("payment.couponApplied", { percent: data.discountPercentage }));
      },
      onError: () => {
        setAppliedDiscount(null);
        Alert.alert(t("error"), t("payment.invalidCoupon"));
      }
    });
  };

  const handlePayment = () => {
    if (!user?.userId) return;
    if (selectedMethod === "wallet") {
      if (!isBalanceSufficient) return Alert.alert(t('common.error'), t('payment.insufficientBalance'));
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
      type: Enums.TransactionType.PAYMENT,
      status: Enums.TransactionStatus.SUCCESS,
      description: `Payment for course: ${course.title} ${appliedDiscount ? `(Code: ${appliedDiscount.code})` : ''}`,
      coins: useCoins ? coinsToUse : 0,
      receiverId: course.creatorId,
      courseVersionId: course.latestPublicVersion.versionId
    };

    createTransaction.mutate(payload, {
      onSuccess: () => {
        Alert.alert(t('common.success'), t('payment.success'));
        refetchWallet();
        refetchCourse();
        navigation.navigate('MyCoursesScreen');
      },
      onError: () => Alert.alert(t('common.error'), t('payment.failed'))
    });
  };

  const processGatewayPayment = () => {
    const cleanAmount = Number(displayFinalPrice.toFixed(2));
    const returnDeepLink = Linking.createURL("payment/result");

    const payload: PaymentRequest & { coins?: number; courseVersionId?: string } = {
      userId: user!.userId,
      amount: cleanAmount,
      provider: gatewayProvider,
      currency: userCurrency,
      type: Enums.TransactionType.PAYMENT,
      returnUrl: returnDeepLink,
      description: `Buy ${course.title}`,
      coins: useCoins ? coinsToUse : 0,
      courseVersionId: course.latestPublicVersion.versionId
    };

    createPaymentUrl.mutate(payload, {
      onSuccess: async (url) => {
        if (url) {
          await WebBrowser.openBrowserAsync(url);
        }
      },
      onError: () => Alert.alert(t('common.error'), t('payment.gatewayError'))
    });
  };

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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.instructor}>by {course.instructor}</Text>
          <View style={styles.divider} />

          {/* Coupon Section */}
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
              <TouchableOpacity style={styles.removeBtn} onPress={() => { setAppliedDiscount(null); setCouponCode(""); }}>
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

          {/* Coin Switch */}
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
              <Text style={styles.discountText}>- ${(coinsToUse / COINS_PER_USD).toFixed(2)}</Text>
            )}
          </View>

          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.label}>{t('payment.total')}</Text>
            {renderPriceDisplay()}
          </View>
        </View>

        {/* Reusable Payment Selector */}
        <PaymentMethodSelector
          selectedMethod={selectedMethod}
          selectedProvider={gatewayProvider}
          onMethodChange={setSelectedMethod}
          onProviderChange={setGatewayProvider}
          walletBalance={walletData?.balance}
          currency={userCurrency}
          showWalletOption={true}
          insufficientBalance={!isBalanceSufficient}
        />

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
  coinSection: { marginTop: 12, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#F3F4F6' },
  coinHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  coinLabel: { marginLeft: 8, fontSize: 14, fontWeight: '600', color: '#4B5563' },
  discountText: { fontSize: 14, fontWeight: '600', color: '#059669', textAlign: 'right', marginTop: 8 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 16, color: "#4B5563" },
  originalPrice: { fontSize: 14, color: '#9CA3AF', textDecorationLine: 'line-through', marginBottom: 2 },
  totalValue: { fontSize: 20, fontWeight: "700", color: "#4F46E5" },
  footer: { padding: 20, backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  payButton: { backgroundColor: "#4F46E5", padding: 16, borderRadius: 12, alignItems: "center" },
  disabledButton: { backgroundColor: "#9CA3AF" },
  payButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});

export default PaymentScreen;